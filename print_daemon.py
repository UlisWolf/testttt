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
#  Reproduit l'aperçu HTML (thème sombre → impression noir/blanc) :
#
#   ┌──────────────────────────────────────────────┐
#   │ APV ROUEN - Mary Automobiles           [RC]  │ ~3 mm (header + sépar.)
#   ├──────────────────────────────────────────────┤
#   │         ORDRE DE REPARATION                  │ ~3 mm
#   │                                              │
#   │         1  2  3  4  5  6                    │ ~33 mm  (OR grand)
#   │                                              │
#   ├──────────────────────────────────────────────┤
#   │              15/06/2026  11:15              │ ~4 mm  (footer centré)
#   └──────────────────────────────────────────────┘
#   Total : ~43 mm / 53 mm  (81 %)  — le reste est la marge de découpe

def build_zpl(or_number: str, magasinier: str) -> str:
    dpm = LABEL_DPI / 25.4          # dots per mm

    def d(mm): return round(mm * dpm)

    PW = d(105)
    LL = d(53)

    # ── Hauteurs (mm) ────────────────────────────────────────────────
    HDR_H  = d(3.2)          # hauteur bande header
    HDR_TH = d(2.6)          # police header
    SEP    = d(0.3)          # épaisseur séparateur
    SUB_H  = d(2.6)          # sous-titre "ORDRE DE REPARATION"
    OR_H   = d(33)           # OR number — grand
    OR_W   = min(d(13.5), (PW - d(3)) // 6)
    FOOT_H = d(3.5)          # footer date (centré)
    FOOT_TH= d(2.8)

    # ── Positions Y (mm) ─────────────────────────────────────────────
    Y_hdr  = 0
    Y_sep1 = HDR_H
    Y_sub  = Y_sep1 + SEP + d(0.5)
    Y_or   = Y_sub  + SUB_H + d(0.8)
    Y_sep2 = Y_or   + OR_H  + d(0.8)
    Y_foot = Y_sep2 + SEP   + d(0.5)

    now   = datetime.datetime.now().strftime("%d/%m/%Y  %H:%M")
    rc_x  = PW - d(10)       # position X du badge RC (droite)

    lines = [
        "^XA",
        f"^PW{PW}",
        f"^LL{LL}",
        "^LH0,0",

        # ── Header : titre gauche + badge RC droit ───────────────────
        f"^FO{d(1.5)},{Y_hdr + d(0.3)}^A0N,{HDR_TH},{HDR_TH}^FDAPV ROUEN - Mary Automobiles^FS",
        f"^FO{rc_x},{Y_hdr + d(0.2)}^A0N,{HDR_TH},{HDR_TH}^FD{magasinier}^FS",

        # Séparateur 1
        f"^FO0,{Y_sep1}^GB{PW},{SEP},{SEP}^FS",

        # ── Sous-titre centré ────────────────────────────────────────
        f"^FO{d(3)},{Y_sub}^A0N,{SUB_H},{SUB_H}^FDORDRE DE REPARATION^FS",

        # ── OR – chiffres larges ─────────────────────────────────────
        f"^FO{d(1.5)},{Y_or}^A0N,{OR_H},{OR_W}^FD{or_number}^FS",

        # Séparateur 2
        f"^FO0,{Y_sep2}^GB{PW},{SEP},{SEP}^FS",

        # ── Footer : date centrée ────────────────────────────────────
        f"^FO{PW // 2 - d(25)},{Y_foot}^A0N,{FOOT_TH},{FOOT_TH}^FD{now}^FS",

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
