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
    now = datetime.datetime.now().strftime("%d/%m/%Y  %H:%M")
    return (
        "^XA\n"
        "^PW840\n"           # Label width  (840 dots = 105 mm)
        "^LL424\n"           # Label length (424 dots =  53 mm)
        "^CI28\n"            # UTF-8
        # Top colour bar (blue)
        "^FO0,0^GB840,18,18,B^FS\n"
        # Title
        "^FO20,22^A0N,26,26^FDAPV ROUEN – Mary Automobiles^FS\n"
        # Separator
        "^FO0,52^GB840,2,2^FS\n"
        # OR number (large)
        "^FO20,64^A0N,22,22^FDORDRE DE RÉPARATION^FS\n"
        f"^FO20,92^A0N,72,72^FD{or_number}^FS\n"
        # Quantity
        "^FO580,92^A0N,34,34^FDQTÉ^FS\n"
        f"^FO580,132^A0N,62,62^FD{qty}^FS\n"
        # Bottom row
        "^FO0,188^GB840,2,2^FS\n"
        f"^FO20,196^A0N,26,26^FDMagasinier : {magasinier}^FS\n"
        f"^FO440,196^A0N,26,26^FD{now}^FS\n"
        # Bottom bar (red)
        "^FO0,236^GB840,18,18,B^FS\n"
        "^XZ\n"
    )

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
