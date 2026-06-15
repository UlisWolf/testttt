"""
APV Rouen – Print Daemon
Polls Google Sheet every 5s, prints PENDING jobs on Godex DT4x (105x53 mm landscape),
marks them PRINTED.

Requirements: pip install gspread google-auth pywin32
Sheet columns: A=Timestamp B=OR C=Quantite D=Magasinier E=Statut
Statut: PENDING -> PRINTING -> PRINTED | ERROR
"""

import os, sys, time, logging, datetime, traceback
import gspread
from google.oauth2.service_account import Credentials

CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS", "service_account.json")
SPREADSHEET_ID   = os.getenv("SPREADSHEET_ID", "")
WORKSHEET_NAME   = os.getenv("WORKSHEET_NAME", "Queue")
PRINTER_NAME     = os.getenv("PRINTER_NAME", "")
POLL_INTERVAL    = int(os.getenv("POLL_INTERVAL", "5"))
LABEL_DPI        = int(os.getenv("LABEL_DPI", "203"))

COL_OR=2; COL_QTY=3; COL_MAGASINIER=4; COL_STATUS=5

SCOPES = ["https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.readonly"]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout),
              logging.FileHandler("print_daemon.log", encoding="utf-8")]
)
log = logging.getLogger("apv")


def build_zpl(or_number: str, magasinier: str) -> str:
    """Build ZPL for a 105x53mm landscape label at LABEL_DPI dpi."""
    dpm = LABEL_DPI / 25.4
    def d(mm): return round(mm * dpm)

    PW  = d(105)   # label width in dots
    LL  = d(53)    # label length in dots
    MAR = d(2.5)   # left/right margin

    SEP1 = max(5, d(1.0))   # thick separator height
    SEP2 = max(2, d(0.3))   # thin separator height

    # ── MARY text ──────────────────────────────────────────────
    MARY_H = d(9)
    MARY_W = d(9)   # square = bold
    Y_MARY = d(1)

    # ── Automobiles text ────────────────────────────────────────
    AUTO_H = d(3)
    AUTO_W = d(2.5)
    Y_AUTO = Y_MARY + MARY_H + d(0.5)

    # ── RC box ──────────────────────────────────────────────────
    BOX_W = d(24)
    BOX_H = d(13)
    BOX_T = max(5, d(1))
    BOX_X = PW - BOX_W - MAR
    BOX_Y = d(0.5)

    # RC text — centered inside box via ^FB
    RC_H = d(9)
    RC_W = d(8)
    # vertical centering: (BOX_H - RC_H) / 2
    RC_TEXT_Y = BOX_Y + BOX_T + (BOX_H - BOX_T - RC_H) // 2

    # ── Thick separator Y ───────────────────────────────────────
    MARY_bottom = Y_AUTO + AUTO_H
    BOX_bottom  = BOX_Y + BOX_H
    Y_SEP1 = max(MARY_bottom, BOX_bottom) + d(0.5)

    # ── ORDRE DE REPARATION subtitle ────────────────────────────
    SUB_H = d(2.5)
    SUB_W = d(1.8)
    Y_SUB = Y_SEP1 + SEP1 + d(1.5)

    # ── 6 digits ────────────────────────────────────────────────
    avail  = PW - 2 * MAR
    DIG_W  = avail // 7        # 6 digits + natural spacing
    DIG_H  = round(DIG_W * 1.5)
    GAP    = (avail - 6 * DIG_W) // 5
    Y_DIG  = Y_SUB + SUB_H + d(2.0)

    # ── Thin separator ──────────────────────────────────────────
    Y_SEP2 = Y_DIG + DIG_H + d(2.0)

    # ── Date ────────────────────────────────────────────────────
    DATE_H = d(2.8)
    DATE_W = d(2.0)
    Y_DATE = Y_SEP2 + SEP2 + d(1.5)

    # Sanity check
    date_bot = Y_DATE + DATE_H
    if date_bot > LL:
        log.warning(f"ZPL layout overflow: date_bot={date_bot} > LL={LL}")

    now_str = datetime.datetime.now().strftime("%d/%m/%Y  %H:%M")
    digits  = or_number.ljust(6)

    lines = [
        "^XA",
        f"^PW{PW}",
        f"^LL{LL}",
        "^LH0,0",
        "^CI28",          # UTF-8 encoding

        # ── MARY ──
        f"^FO{MAR},{Y_MARY}^A0N,{MARY_H},{MARY_W}^FDMARY^FS",

        # ── Automobiles ──
        f"^FO{MAR},{Y_AUTO}^A0N,{AUTO_H},{AUTO_W}^FDAutomobiles^FS",

        # ── RC box ──
        f"^FO{BOX_X},{BOX_Y}^GB{BOX_W},{BOX_H},{BOX_T}^FS",

        # ── RC text centered in box via ^FB ──
        f"^FO{BOX_X},{RC_TEXT_Y}^A0N,{RC_H},{RC_W}^FB{BOX_W},1,0,C^FD{magasinier}^FS",

        # ── Thick separator ──
        f"^FO0,{Y_SEP1}^GB{PW},{SEP1},{SEP1}^FS",

        # ── ORDRE DE REPARATION ──
        f"^FO0,{Y_SUB}^A0N,{SUB_H},{SUB_W}^FB{PW},1,0,C^FDORDRE DE REPARATION^FS",
    ]

    # ── 6 digits individually ──
    x = MAR
    for digit in digits:
        lines.append(f"^FO{x},{Y_DIG}^A0N,{DIG_H},{DIG_W}^FD{digit}^FS")
        x += DIG_W + GAP

    lines += [
        # ── Thin separator ──
        f"^FO0,{Y_SEP2}^GB{PW},{SEP2},{SEP2}^FS",

        # ── Date centered ──
        f"^FO0,{Y_DATE}^A0N,{DATE_H},{DATE_W}^FB{PW},1,0,C^FD{now_str}^FS",

        "^XZ",
    ]

    return "\n".join(lines)


def print_copies(or_number: str, copies: int, magasinier: str) -> None:
    """Send ZPL to the Windows printer via win32print, or log to console."""
    zpl = build_zpl(or_number, magasinier)

    try:
        import win32print
        printer_name = PRINTER_NAME or win32print.GetDefaultPrinter()
        log.info(f"Printing OR={or_number} x{copies} on [{printer_name}]")
        for i in range(copies):
            handle = win32print.OpenPrinter(printer_name)
            try:
                job = win32print.StartDocPrinter(handle, 1,
                      (f"APV-OR-{or_number}-{i+1}", None, "RAW"))
                win32print.StartPagePrinter(handle)
                win32print.WritePrinter(handle, zpl.encode("utf-8"))
                win32print.EndPagePrinter(handle)
                win32print.EndDocPrinter(handle)
            finally:
                win32print.ClosePrinter(handle)
        log.info(f"Printed {copies} label(s) for OR={or_number}")
    except ImportError:
        log.warning("win32print not available — printing to stdout (dev mode)")
        for i in range(copies):
            print(f"\n{'='*60}")
            print(f"[LABEL {i+1}/{copies}]  OR={or_number}  magasinier={magasinier}")
            print(zpl)
            print('='*60)


def connect() -> gspread.Worksheet:
    """Authenticate and return the Queue worksheet."""
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    gc    = gspread.authorize(creds)
    sh    = gc.open_by_key(SPREADSHEET_ID)
    return sh.worksheet(WORKSHEET_NAME)


def fetch_pending(ws: gspread.Worksheet):
    """Return list of (row_idx, or_num, copies, magasinier) for PENDING rows."""
    all_rows = ws.get_all_values()
    pending  = []
    for i, row in enumerate(all_rows):
        if len(row) < COL_STATUS:
            continue
        status = row[COL_STATUS - 1].strip().upper()
        if status == "PENDING":
            row_idx   = i + 1   # 1-based
            or_num    = row[COL_OR - 1].strip()
            try:
                copies = max(1, int(row[COL_QTY - 1].strip()))
            except (ValueError, IndexError):
                copies = 1
            mag = row[COL_MAGASINIER - 1].strip() if len(row) >= COL_MAGASINIER else "RC"
            pending.append((row_idx, or_num, copies, mag))
    return pending


def set_status(ws: gspread.Worksheet, row: int, status: str) -> None:
    """Update the status cell for a given row."""
    ws.update_cell(row, COL_STATUS, status)


def main() -> None:
    if not SPREADSHEET_ID:
        log.error("SPREADSHEET_ID is not set. Export it before starting the daemon.")
        sys.exit(1)

    log.info("=" * 60)
    log.info("APV Rouen – Print Daemon starting")
    log.info(f"  Spreadsheet : {SPREADSHEET_ID}")
    log.info(f"  Worksheet   : {WORKSHEET_NAME}")
    log.info(f"  Printer     : {PRINTER_NAME or '(default)'}")
    log.info(f"  Poll        : every {POLL_INTERVAL}s")
    log.info(f"  DPI         : {LABEL_DPI}")
    log.info("=" * 60)

    ws = None
    while True:
        try:
            if ws is None:
                log.info("Connecting to Google Sheets…")
                ws = connect()
                log.info("Connected.")

            jobs = fetch_pending(ws)
            if jobs:
                log.info(f"Found {len(jobs)} PENDING job(s)")

            for (row_idx, or_num, copies, mag) in jobs:
                log.info(f"Processing row {row_idx}: OR={or_num} qty={copies} mag={mag}")
                try:
                    set_status(ws, row_idx, "PRINTING")
                    print_copies(or_num, copies, mag)
                    set_status(ws, row_idx, "PRINTED")
                    log.info(f"  -> PRINTED")
                except Exception as e:
                    log.error(f"  -> ERROR: {e}")
                    traceback.print_exc()
                    try:
                        set_status(ws, row_idx, "ERROR")
                    except Exception:
                        pass

        except gspread.exceptions.APIError as e:
            log.error(f"Google Sheets API error: {e}")
            ws = None   # force reconnect
        except Exception as e:
            log.error(f"Unexpected error: {e}")
            traceback.print_exc()
            ws = None

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
