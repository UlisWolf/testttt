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

# ── ZPL PAYSAGE 105×53 mm — Godex DT4x ───────────────────────────────────────
#
#   ^PW = 105 mm  ^LL = 53 mm
#
#   ╔══ MARY  ════════════════════════════════════════╦══════════╗
#   ║   Automobiles                                   ║    RC    ║  ~13 mm
#   ╠═════════════════ ligne épaisse ═════════════════╩══════════╣
#   ║         O R D R E   D E   R E P A R A T I O N             ║  ~5 mm
#   ║                                                            ║
#   ║       3       0       6       5       4       8            ║  ~20 mm
#   ║                                                            ║
#   ╠──────────────────── ligne fine ────────────────────────────╣
#   ║               15/06/2026   11:49                           ║  ~5 mm
#   ╚════════════════════════════════════════════════════════════╝
#                                                          53 mm

def build_zpl(or_number: str, magasinier: str) -> str:
    dpm = LABEL_DPI / 25.4

    def d(mm): return round(mm * dpm)

    PW  = d(105)   # largeur
    LL  = d(53)    # hauteur
    MAR = d(2.5)   # marge gauche/droite

    SEP1 = max(4, d(0.8))   # ligne épaisse sous le header
    SEP2 = max(2, d(0.25))  # ligne fine au-dessus du footer

    # ── MARY + Automobiles (haut gauche) ─────────────────────────
    MARY_H = d(8.5);  MARY_W = d(8.5)   # carré = gras maximal
    AUTO_H = d(3.0);  AUTO_W = d(2.3)
    Y_MARY = d(1.0)
    Y_AUTO = Y_MARY + MARY_H + d(0.6)

    # ── Cadre RC (haut droite) ───────────────────────────────────
    RC_H  = d(8.0);  RC_W = d(7.0)
    BOX_W = d(22);   BOX_H = d(13);  BOX_T = max(5, d(0.9))
    BOX_X = PW - BOX_W - MAR
    BOX_Y = d(0.5)
    RC_TX = BOX_X + (BOX_W - 2 * RC_W) // 2
    RC_TY = BOX_Y + (BOX_H - RC_H)     // 2

    # ── Séparateur 1 (épais) ─────────────────────────────────────
    HEADER_BOT = max(Y_AUTO + AUTO_H, BOX_Y + BOX_H) + d(0.8)
    Y_SEP1 = HEADER_BOT

    # ── "O R D R E   D E   R E P A R A T I O N" ─────────────────
    SPACED = "O R D R E   D E   R E P A R A T I O N"
    SUB_H  = d(2.4);  SUB_W = d(1.7)
    # Estimation largeur : nb chars × largeur de cellule
    sub_est = len(SPACED) * SUB_W
    SUB_X   = max(MAR, (PW - sub_est) // 2)
    Y_SUB   = Y_SEP1 + SEP1 + d(1.8)

    # ── 6 chiffres — répartis sur toute la largeur utile ─────────
    avail = PW - 2 * MAR
    DIG_W = avail // 7           # 6 chiffres + marges inter = 7 unités
    DIG_H = round(DIG_W * 1.50)  # proportionnel
    GAP   = (avail - 6 * DIG_W) // 5

    Y_DIG = Y_SUB + SUB_H + d(1.8)

    # ── Séparateur 2 (fin) ────────────────────────────────────────
    Y_SEP2 = Y_DIG + DIG_H + d(1.8)

    # ── Date centrée ─────────────────────────────────────────────
    DATE_H = d(2.8);  DATE_W = d(2.0)
    now    = datetime.datetime.now().strftime("%d/%m/%Y   %H:%M")
    date_est = len(now) * DATE_W
    DATE_X   = max(0, (PW - date_est) // 2)
    Y_DATE   = Y_SEP2 + SEP2 + d(1.0)

    lines = [
        "^XA",
        f"^PW{PW}",
        f"^LL{LL}",
        "^LH0,0",

        # MARY (gras) + Automobiles
        f"^FO{MAR},{Y_MARY}^A0N,{MARY_H},{MARY_W}^FDMARY^FS",
        f"^FO{MAR},{Y_AUTO}^A0N,{AUTO_H},{AUTO_W}^FDAutomobiles^FS",

        # Cadre RC épais
        f"^FO{BOX_X},{BOX_Y}^GB{BOX_W},{BOX_H},{BOX_T}^FS",
        f"^FO{RC_TX},{RC_TY}^A0N,{RC_H},{RC_W}^FD{magasinier}^FS",

        # Séparateur 1 — épais
        f"^FO0,{Y_SEP1}^GB{PW},{SEP1},{SEP1}^FS",

        # ORDRE DE REPARATION — lettres espacées, centré
        f"^FO{SUB_X},{Y_SUB}^A0N,{SUB_H},{SUB_W}^FD{SPACED}^FS",
    ]

    # 6 chiffres positionnés un par un
    x = MAR
    for i, digit in enumerate(or_number):
        lines.append(f"^FO{x},{Y_DIG}^A0N,{DIG_H},{DIG_W}^FD{digit}^FS")
        if i < 5:
            x += DIG_W + GAP

    lines += [
        # Séparateur 2 — fin
        f"^FO0,{Y_SEP2}^GB{PW},{SEP2},{SEP2}^FS",

        # Date centrée
        f"^FO{DATE_X},{Y_DATE}^A0N,{DATE_H},{DATE_W}^FD{now}^FS",

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
