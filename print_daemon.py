"""
APV Rouen – Print Daemon
Polls the Google Sheet every 5 s, prints PENDING jobs on Godex DT4x (105×53 mm),
then marks them PRINTED.

Requirements:
    pip install gspread google-auth

Setup:
    1. Create a Google Cloud service account and download the JSON key.
    2. Share the Google Sheet with the service account e-mail (Viewer is enough
       for reading; Editor is required so the daemon can update the Status column).
    3. Set CREDENTIALS_FILE and SPREADSHEET_ID below (or via environment variables).

Sheet columns (row 1 = header):
    A: Timestamp  B: OR  C: Quantité  D: Magasinier  E: Statut
    Status values: PENDING → PRINTING → PRINTED | ERROR
"""

import os
import sys
import time
import logging
import datetime
import traceback

import gspread
from google.oauth2.service_account import Credentials

# ── Configuration ────────────────────────────────────────────────────────────

CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS", "service_account.json")
SPREADSHEET_ID   = os.getenv("SPREADSHEET_ID", "")   # Sheet ID from the URL
WORKSHEET_NAME   = os.getenv("WORKSHEET_NAME", "Queue")
PRINTER_NAME     = os.getenv("PRINTER_NAME", "")     # Leave blank for default printer
POLL_INTERVAL    = int(os.getenv("POLL_INTERVAL", "5"))

# Column indices (1-based)
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

# ── ZPL label template (Godex DT4x, 105×53 mm @ 203 dpi = 840×424 dots) ────

def build_zpl(or_number: str, qty: int, magasinier: str) -> str:
    """
    105 mm × 53 mm @ 203 dpi  =  840 × 424 dots
    Utilise toute la hauteur (95 %) :

      Y  0..30  barre bleue haut  (texte blanc inversé)
      Y 32..34  séparateur
      Y 36..56  sous-étiquettes  "ORDRE DE REPARATION" | "QTE"
      Y 58..336 OR (hauteur 278) col gauche   X 10..564  (6×92=552)
                QTE (hauteur 278) col droite  X 580..820 (3×80=240)
      Y 338..340 séparateur
      Y 342..372 magasinier + date  (28pt)
      Y 374..404 barre bleue bas
      ─────── total 404 / 424 dots ───────────────────────────────
    """
    now = datetime.datetime.now().strftime("%d/%m/%Y  %H:%M")
    return "\n".join([
        "^XA",
        "^PW840",
        "^LL424",
        "^LH0,0",

        # Barre bleue haut (Y 0..30)
        "^FO0,0^GB840,30,30^FS",
        "^FO12,3^A0N,26,26^FR^FDAPV ROUEN  Mary Automobiles^FS",

        # Séparateur (Y 32)
        "^FO0,32^GB840,2,2^FS",

        # Sous-étiquettes (Y 36)
        "^FO12,36^A0N,20,20^FDORDRE DE REPARATION^FS",
        "^FO648,36^A0N,20,20^FDQTE^FS",

        # OR – col gauche, police 278×92 (Y 58..336)
        f"^FO10,58^A0N,278,92^FD{or_number}^FS",

        # Séparateur vertical entre les deux colonnes
        "^FO574,34^GB2,302,2^FS",

        # QTE – col droite, police 278×80 (Y 58..336)
        f"^FO582,58^A0N,278,80^FD{qty}^FS",

        # Séparateur (Y 338)
        "^FO0,338^GB840,2,2^FS",

        # Pied : magasinier + date (Y 342)
        f"^FO12,342^A0N,28,28^FDMagasinier : {magasinier}^FS",
        f"^FO490,342^A0N,28,28^FD{now}^FS",

        # Barre bleue bas (Y 374..404)
        "^FO0,374^GB840,30,30^FS",

        "^XZ",
    ])

# ── Printing ──────────────────────────────────────────────────────────────────

def print_label(or_number: str, qty: int, magasinier: str) -> None:
    zpl = build_zpl(or_number, qty, magasinier)
    raw = zpl.encode("utf-8")

    try:
        import win32print
    except ImportError:
        log.warning("win32print not available – writing label to console (dev mode)")
        log.info("--- ZPL LABEL ---\n%s--- END ---", zpl)
        return

    printer = PRINTER_NAME or win32print.GetDefaultPrinter()
    log.info("Sending to printer: %s", printer)

    hPrinter = win32print.OpenPrinter(printer)
    try:
        hJob = win32print.StartDocPrinter(hPrinter, 1, ("APV Label", None, "RAW"))
        win32print.StartPagePrinter(hPrinter)
        win32print.WritePrinter(hPrinter, raw)
        win32print.EndPagePrinter(hPrinter)
        win32print.EndDocPrinter(hPrinter)
    finally:
        win32print.ClosePrinter(hPrinter)

    log.info("Printed OR=%s qty=%s", or_number, qty)

# ── Google Sheets helpers ──────────────────────────────────────────────────────

def connect() -> gspread.Worksheet:
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    gc    = gspread.authorize(creds)
    sh    = gc.open_by_key(SPREADSHEET_ID)
    return sh.worksheet(WORKSHEET_NAME)

def fetch_pending(ws: gspread.Worksheet):
    """Return list of (row_index, or, qty, magasinier) for PENDING rows."""
    records = ws.get_all_values()
    pending = []
    for i, row in enumerate(records[1:], start=2):  # skip header
        if len(row) >= COL_STATUS and row[COL_STATUS - 1].strip().upper() == "PENDING":
            or_num = row[COL_OR - 1].strip()
            qty    = row[COL_QTY - 1].strip()
            mag    = row[COL_MAGASINIER - 1].strip() if len(row) >= COL_MAGASINIER else "RC"
            pending.append((i, or_num, qty or "1", mag))
    return pending

def set_status(ws: gspread.Worksheet, row: int, status: str) -> None:
    ws.update_cell(row, COL_STATUS, status)

# ── Main loop ─────────────────────────────────────────────────────────────────

def main() -> None:
    if not SPREADSHEET_ID:
        log.error("SPREADSHEET_ID is not set. Export it as an env variable or edit this file.")
        sys.exit(1)

    log.info("APV Rouen print daemon starting (poll every %ds)", POLL_INTERVAL)

    ws = None
    while True:
        try:
            if ws is None:
                ws = connect()
                log.info("Connected to sheet: %s", WORKSHEET_NAME)

            jobs = fetch_pending(ws)
            if jobs:
                log.info("%d job(s) in queue", len(jobs))

            for row_idx, or_num, qty, mag in jobs:
                log.info("Processing row %d  OR=%s  qty=%s  mag=%s", row_idx, or_num, qty, mag)
                set_status(ws, row_idx, "PRINTING")
                try:
                    print_label(or_num, int(qty), mag)
                    set_status(ws, row_idx, "PRINTED")
                except Exception as e:
                    log.error("Print failed for OR=%s: %s", or_num, e)
                    set_status(ws, row_idx, "ERROR")

        except gspread.exceptions.APIError as e:
            log.warning("Sheets API error: %s – reconnecting next cycle", e)
            ws = None
        except Exception:
            log.error("Unexpected error:\n%s", traceback.format_exc())
            ws = None

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
