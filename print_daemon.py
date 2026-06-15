"""
APV Rouen – Print Daemon
Polls the Google Sheet every 5 s, prints PENDING jobs on Godex DT4x (105×53 mm),
then marks them PRINTED.

Requirements:
    pip install gspread google-auth

Setup:
    1. Create a Google Cloud service account and download the JSON key.
    2. Share the Google Sheet with the service account e-mail (Editor role).
    3. Set env variables in start_daemon.vbs (SPREADSHEET_ID, LABEL_DPI, etc.)

Sheet columns (row 1 = header):
    A: Timestamp  B: OR  C: Quantité  D: Magasinier  E: Statut
    Statut lifecycle: PENDING -> PRINTING -> PRINTED | ERROR

LABEL_DPI:
    Godex DT4x 203 dpi -> set LABEL_DPI=203 (default)
    Godex DT4x 300 dpi -> set LABEL_DPI=300
    To check: Panneau de configuration -> Imprimantes -> clic droit Godex
              -> Proprietes d'impression -> onglet Graphiques -> Resolution
"""

import os
import sys
import time
import logging
import datetime
import traceback

import gspread
from google.oauth2.service_account import Credentials

# ── Configuration ─────────────────────────────────────────────────────────────

CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS", "service_account.json")
SPREADSHEET_ID   = os.getenv("SPREADSHEET_ID", "")
WORKSHEET_NAME   = os.getenv("WORKSHEET_NAME", "Queue")
PRINTER_NAME     = os.getenv("PRINTER_NAME", "")
POLL_INTERVAL    = int(os.getenv("POLL_INTERVAL", "5"))
LABEL_DPI        = int(os.getenv("LABEL_DPI", "203"))

COL_TIMESTAMP  = 1
COL_OR         = 2
COL_QTY        = 3
COL_MAGASINIER = 4
COL_STATUS     = 5

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("print_daemon.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("apv")

# ── ZPL label (105 × 53 mm, DPI-aware) ───────────────────────────────────────
#
#  Layout (all sizes calculated from mm so it scales at 203 or 300 dpi):
#
#   ┌──────────────────────────────────────────────┐
#   │ ██ APV ROUEN  Mary Automobiles  ██ (3mm bar)│
#   ├──────────────────────────────────────────────┤
#   │ ORDRE DE REPARATION          15/06 11:15    │ 3mm
#   ├──────────────────────────────────────────────┤
#   │                                              │
#   │         1  2  3  4  5  6   (OR, 32mm high) │
#   │                                              │
#   ├──────────────────────────────────────────────┤
#   │ Magasinier : RC                              │ 3.5mm
#   │ ██████████████████████████████  (3mm bar)  │
#   └──────────────────────────────────────────────┘
#   Total: ~47mm / 53mm used (89%)

def build_zpl(or_number: str, magasinier: str) -> str:
    dpm = LABEL_DPI / 25.4          # dots per mm

    def d(mm): return round(mm * dpm)

    PW = d(105)                     # label width
    LL = d(53)                      # label height

    # Vertical layout (mm from top)
    BAR_H   = d(3.5)                # blue bar height
    HDR_Y   = d(0.4)                # header text Y inside bar
    SEP1    = BAR_H + d(0.3)        # first separator Y
    SUB_Y   = SEP1 + d(0.6)        # sub-label "ORDRE DE REPARATION"
    SUB_H   = d(2.8)                # sub-label font height
    OR_Y    = SUB_Y + SUB_H + d(1) # OR number starts here
    OR_H    = d(31)                 # OR font height  (fills most of label)
    OR_W    = min(d(13.5), (PW - d(2)) // 6)  # width per char, max 6 fit
    SEP2    = OR_Y + OR_H + d(1)   # second separator
    FOOT_Y  = SEP2 + d(0.8)        # footer text
    FOOT_H  = d(3.2)               # footer font height
    BAR2_Y  = FOOT_Y + FOOT_H + d(1)  # bottom bar

    now = datetime.datetime.now().strftime("%d/%m/%Y  %H:%M")

    lines = [
        "^XA",
        f"^PW{PW}",
        f"^LL{LL}",
        "^LH0,0",

        # Top blue bar + white title
        f"^FO0,0^GB{PW},{BAR_H},{BAR_H}^FS",
        f"^FO{d(1.5)},{HDR_Y}^A0N,{BAR_H - d(0.8)},{BAR_H - d(0.8)}^FR^FDAPV ROUEN  Mary Automobiles^FS",

        # Separator
        f"^FO0,{SEP1}^GB{PW},{d(0.25)},{d(0.25)}^FS",

        # Sub-label left + date right
        f"^FO{d(1.5)},{SUB_Y}^A0N,{SUB_H},{SUB_H}^FDORDRE DE REPARATION^FS",
        f"^FO{PW - d(35)},{SUB_Y}^A0N,{SUB_H},{SUB_H}^FD{now}^FS",

        # OR number – big, full width
        f"^FO{d(1.5)},{OR_Y}^A0N,{OR_H},{OR_W}^FD{or_number}^FS",

        # Separator
        f"^FO0,{SEP2}^GB{PW},{d(0.25)},{d(0.25)}^FS",

        # Footer
        f"^FO{d(1.5)},{FOOT_Y}^A0N,{FOOT_H},{FOOT_H}^FDMagasinier : {magasinier}^FS",

        # Bottom blue bar
        f"^FO0,{BAR2_Y}^GB{PW},{BAR_H},{BAR_H}^FS",

        "^XZ",
    ]
    return "\n".join(lines)

# ── Printing ──────────────────────────────────────────────────────────────────

def print_copies(or_number: str, copies: int, magasinier: str) -> None:
    """Print `copies` identical labels for this OR number."""
    zpl = build_zpl(or_number, magasinier)
    raw = zpl.encode("utf-8")

    try:
        import win32print
    except ImportError:
        log.warning("win32print not available – dev mode, printing to console")
        log.info("--- ZPL (%d cop.) ---\n%s\n--- END ---", copies, zpl)
        return

    printer = PRINTER_NAME or win32print.GetDefaultPrinter()
    log.info("Printer: %s  copies: %d", printer, copies)

    hPrinter = win32print.OpenPrinter(printer)
    try:
        for n in range(copies):
            hJob = win32print.StartDocPrinter(hPrinter, 1, (f"APV-{or_number}-{n+1}", None, "RAW"))
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, raw)
            win32print.EndPagePrinter(hPrinter)
            win32print.EndDocPrinter(hPrinter)
            log.info("  copy %d/%d sent", n + 1, copies)
    finally:
        win32print.ClosePrinter(hPrinter)

    log.info("Done OR=%s  %d copies", or_number, copies)

# ── Google Sheets helpers ──────────────────────────────────────────────────────

def connect() -> gspread.Worksheet:
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    gc    = gspread.authorize(creds)
    sh    = gc.open_by_key(SPREADSHEET_ID)
    return sh.worksheet(WORKSHEET_NAME)

def fetch_pending(ws: gspread.Worksheet):
    records = ws.get_all_values()
    pending = []
    for i, row in enumerate(records[1:], start=2):
        if len(row) >= COL_STATUS and row[COL_STATUS - 1].strip().upper() == "PENDING":
            or_num  = row[COL_OR - 1].strip()
            copies  = row[COL_QTY - 1].strip()
            mag     = row[COL_MAGASINIER - 1].strip() if len(row) >= COL_MAGASINIER else "RC"
            pending.append((i, or_num, int(copies or "1"), mag))
    return pending

def set_status(ws: gspread.Worksheet, row: int, status: str) -> None:
    ws.update_cell(row, COL_STATUS, status)

# ── Main loop ─────────────────────────────────────────────────────────────────

def main() -> None:
    if not SPREADSHEET_ID:
        log.error("SPREADSHEET_ID not set.")
        sys.exit(1)

    log.info("APV Rouen daemon starting — DPI=%d  poll=%ds", LABEL_DPI, POLL_INTERVAL)

    ws = None
    while True:
        try:
            if ws is None:
                ws = connect()
                log.info("Connected to sheet: %s", WORKSHEET_NAME)

            jobs = fetch_pending(ws)
            for row_idx, or_num, copies, mag in jobs:
                log.info("Job  OR=%s  copies=%d  mag=%s", or_num, copies, mag)
                set_status(ws, row_idx, "PRINTING")
                try:
                    print_copies(or_num, copies, mag)
                    set_status(ws, row_idx, "PRINTED")
                except Exception as e:
                    log.error("Print error OR=%s: %s", or_num, e)
                    set_status(ws, row_idx, "ERROR")

        except gspread.exceptions.APIError as e:
            log.warning("Sheets API error: %s", e)
            ws = None
        except Exception:
            log.error("Unexpected:\n%s", traceback.format_exc())
            ws = None

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
