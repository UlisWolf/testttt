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

# ── ZPL — correspond exactement au preview webapp (paysage 105×53 mm) ─────────
#
#   PW = 105 mm  (largeur)   LL = 53 mm  (hauteur / avance papier)
#
#   ┌──────────────────────────────────────────────────── 105 mm ──┐
#   │ MARY                                              ┌────────┐ │
#   │ Automobiles                                       │   RC   │ │  ~11 mm
#   ├───────────────────────────────────────────────────┴────────┴─┤
#   │         O R D R E   D E   R E P A R A T I O N               │  ~3 mm
#   │                                                              │
#   │            3     0     6     5     4     8                   │  ~20 mm
#   │                                                              │
#   ├──────────────────────────────────────────────────────────────┤
#   │                    15/06/2026   11:49                        │  ~4 mm
#   └──────────────────────────────────────────────────────────────┘
#
#  Si l'étiquette est coupée à la moitié → changer LABEL_DPI=300 dans le VBS

ORDRE_SPACED = "O R D R E   D E   R E P A R A T I O N"

def build_zpl(or_number: str, magasinier: str) -> str:
    dpm = LABEL_DPI / 25.4

    def d(mm): return round(mm * dpm)

    PW  = d(105)   # largeur paysage
    LL  = d(53)    # hauteur paysage
    SEP = max(2, d(0.25))
    MAR = d(1.5)

    # ── Polices ───────────────────────────────────────────────────
    MARY_H = d(5.5);  MARY_W = d(4.5)   # MARY — grand
    AUTO_H = d(2.0);  AUTO_W = d(1.5)   # Automobiles
    RC_H   = d(4.8);  RC_W   = d(3.8)   # RC dans cadre
    SUB_H  = d(1.9);  SUB_W  = d(1.35)  # ORDRE DE REPARATION (lettre-espacé)
    DATE_H = d(2.4);  DATE_W = d(1.8)   # date bas

    # ── Cadre RC (haut droite) ────────────────────────────────────
    BOX_W = d(13.5); BOX_H = d(9.5); BOX_T = max(2, d(0.4))
    BOX_X = PW - BOX_W - MAR
    BOX_Y = d(1.0)
    RC_TX = BOX_X + (BOX_W - 2 * RC_W) // 2
    RC_TY = BOX_Y + (BOX_H - RC_H)   // 2

    # ── OR : 6 chiffres espacés sur une seule ligne ───────────────
    spaced_or = " ".join(or_number)          # "306548" → "3 0 6 5 4 8"
    n_or      = 2 * len(or_number) - 1      # 11 chars
    OR_W  = (PW - 2 * MAR) // n_or          # largeur par char
    OR_H  = min(d(20), round(OR_W * 1.55))  # hauteur proportionnelle, max 20mm
    OR_X  = (PW - n_or * OR_W) // 2         # centré

    # ── Positions Y ───────────────────────────────────────────────
    Y_MARY = d(1.2)
    Y_AUTO = Y_MARY + MARY_H + d(0.4)
    Y_SEP1 = max(Y_AUTO + AUTO_H, BOX_Y + BOX_H) + d(1.0)

    sub_chars  = len(ORDRE_SPACED)
    SUB_X = max(MAR, (PW - sub_chars * SUB_W) // 2)
    Y_SUB = Y_SEP1 + SEP + d(0.8)

    Y_OR   = Y_SUB + SUB_H + d(1.5)
    Y_SEP2 = Y_OR  + OR_H  + d(1.5)

    now    = datetime.datetime.now().strftime("%d/%m/%Y   %H:%M")
    DATE_X = max(0, (PW - len(now) * DATE_W) // 2)
    Y_DATE = Y_SEP2 + SEP + d(0.8)

    return "\n".join([
        "^XA",
        f"^PW{PW}",
        f"^LL{LL}",
        "^LH0,0",

        # MARY grand
        f"^FO{MAR},{Y_MARY}^A0N,{MARY_H},{MARY_W}^FDMARY^FS",
        f"^FO{MAR},{Y_AUTO}^A0N,{AUTO_H},{AUTO_W}^FDAutomobiles^FS",

        # Cadre RC
        f"^FO{BOX_X},{BOX_Y}^GB{BOX_W},{BOX_H},{BOX_T}^FS",
        f"^FO{RC_TX},{RC_TY}^A0N,{RC_H},{RC_W}^FD{magasinier}^FS",

        # Séparateur 1
        f"^FO0,{Y_SEP1}^GB{PW},{SEP},{SEP}^FS",

        # ORDRE DE REPARATION centré avec espacement
        f"^FO{SUB_X},{Y_SUB}^A0N,{SUB_H},{SUB_W}^FD{ORDRE_SPACED}^FS",

        # OR — 6 chiffres espacés, grande police, centré
        f"^FO{OR_X},{Y_OR}^A0N,{OR_H},{OR_W}^FD{spaced_or}^FS",

        # Séparateur 2
        f"^FO0,{Y_SEP2}^GB{PW},{SEP},{SEP}^FS",

        # Date centrée
        f"^FO{DATE_X},{Y_DATE}^A0N,{DATE_H},{DATE_W}^FD{now}^FS",

        "^XZ",
    ])

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
