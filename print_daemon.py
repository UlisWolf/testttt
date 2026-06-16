"""
APV Rouen - Print Daemon (Godex DT4x)
======================================
Surveille un Google Sheet et imprime les etiquettes en attente sur la Godex DT4x.
Etiquette : 105 x 53 mm paysage, monochrome thermique.

Mise en page (identique a l'apercu web) :
  +----------------------------------------------+
  | [LOGO MARY AUTOMOBILES]              [ RC ]  |  <- bandeau
  +==============================================+  <- trait epais
  |                                              |
  |                3 0 6 4 6 5                   |  <- OR centre
  |                                              |
  +----------------------------------------------+  <- trait fin
  | ORDRE DE REPARATION         14/06/2025 09:41 |  <- pied
  +----------------------------------------------+

Dependances :
    pip install gspread google-auth pywin32

Colonnes du Sheet (onglet "Queue") :
    A=Timestamp  B=OR  C=Quantite  D=Magasinier  E=Statut
    Statut : PENDING -> PRINTING -> PRINTED | ERROR

Variables d'environnement (ou valeurs par defaut ci-dessous) :
    GOOGLE_CREDENTIALS  chemin du service_account.json
    SPREADSHEET_ID      id du Google Sheet
    WORKSHEET_NAME      nom de l'onglet (defaut: Queue)
    PRINTER_NAME        nom Windows de l'imprimante (defaut: imprimante par defaut)
    POLL_INTERVAL       secondes entre deux verifications (defaut: 5)
"""

import os
import sys
import time
import logging
import datetime
import traceback

import gspread
from google.oauth2.service_account import Credentials

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS", "service_account.json")
SPREADSHEET_ID   = os.getenv("SPREADSHEET_ID", "")
WORKSHEET_NAME   = os.getenv("WORKSHEET_NAME", "Queue")
PRINTER_NAME     = os.getenv("PRINTER_NAME", "")
POLL_INTERVAL    = int(os.getenv("POLL_INTERVAL", "5"))
LABEL_DPI        = int(os.getenv("LABEL_DPI", "203"))

# Colonnes (1-based)
COL_TIMESTAMP = 1
COL_OR        = 2
COL_QTY       = 3
COL_MAG       = 4
COL_STATUS    = 5

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("print_daemon.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("apv")

# ---------------------------------------------------------------------------
# Logo Mary Automobiles - bitmap monochrome genere depuis IMG_3535.PNG
# Format : largeur=220 dots, hauteur=73 dots
# NE PAS EDITER A LA MAIN.
# ---------------------------------------------------------------------------
_LOGO_W     = 220
_LOGO_H     = 73
_LOGO_BPR   = 28
_LOGO_TOTAL = 2044
_LOGO_HEX   = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0F0003FFE0003FFFFFFFFFF8000FFFC001FFE001FFFFFFFFFFFFFFFF0E0001FFC0003FFFE07FFFF000003FC0007FC000FFFFFFFFFFFFFFFF0E0000FFC0003FFFC03FFFF000000FE0007F8001FFFFFFFFFFFFFFFF0E0000FF80003FFF801FFFF0000003E0003F8003FFFFFFFFFFFFFFFF0E0000FF80003FFF801FFFF0000001F0003F0003FFFFFFFFFFFFFFFF0E00007F80003FFF001FFFF0000001F8001F0007FFFFFFFFFFFFFFFF0E00007F00003FFF001FFFF0000000F8001E000FFFFFFFFFFFFFFFFF0E00007F00003FFE001FFFF0000000FC000C000FFFFFFFFFFFFFFFFF0E00003F00003FFE003FFFF00000007E000C001FFFFFFFFFFFFFFFFF0E00003E00003FFC003FFFF00000007E0000003FFFFFFFFFFFFFFFFF0E00003E00003FFC007FFFF001F8007F0000003FFFFFFFFFFFFFFFFF0E00001E00003FF8007FFFF001F8007F8000007FFFFFFFFFFFFFFFFF0E00001E00003FF800FFFFF001F8007F800000FFFFFFFFFFFFFFFFFF0E00001C00003FF000FFFFF001F0007FC00001FFFFFFFFFFFFFFFFFF0E00000C00003FF001FFFFF00000007FE00001FFFFFFFFFFFFFFFFFF0E00000C00003FE001FFFFF0000000FFE00003FFFFFFFFFFFFFFFFFF0E00000800003FE003FFFFF0000000FFF00007FFFFFFFFFFFFFFFFFF0E00200000003FC003E07FF0000001FFF8000FFFFFFFFFFFFFFFFFFF0E00200002003FC007003FF0000003FFF8000FFFFFFFFFFFFFFFFFFF0E00200002003F8000001FF0000007FFFC001FFFFFFFFFFFFFFFFFFF0E00300006003F0000001FF000001FFFFC001FFFFFFFFFFFFFFFFFFF0E00300006003F0000000FF000000FFFFC001FFFFFFFFFFFFFFFFFFF0E00300006003E0000000FF0000007FFFC001FFFFFFFFFFFFFFFFFFF0E0038000E003E00000007F0010007FFFC001FFFFFFFFFFFFFFFFFFF0E0038000E003C00000007F0018003FFFC001FFFFFFFFFFFFFFFFFFF0E0038000E003C00000003F0008001FFFC001FFFFFFFFFFFFFFFFFFF0E003C001E003800000003F000C001FFFC001FFFFFFFFFFFFFFFFFFF0E003C001E003800000001F000C000FFFC001FFFFFFFFFFFFFFFFFFF0E001C001E003800003001F000E0007FFC001FFFFFFFFFFFFFFFFFFF0E001E003E00380001F000F000F0007FFC001FFFFFFFFFFFFFFFFFFF0E001E003E00380007F8007000F0003FFC001FFFFFFFFFFFFFFFFFFF0E001E007E003C007FF8007000F8003FFC001FFFFFFFFFFFFFFFFFFF0E001F007C001E03FFFC03F000F8001FFC001FFFFFFFFFFFFFFFFFFF0F003F007E003F0FFFFF1FF001FC001FFE003FFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFDFFFFFFFFFFFFF0FFF81FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC1FFFF07C1FFFFFFFFFF0FFF00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC1FFFE07C1FFFFFFFFFF0FFF00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC1FFFE03C1FFFFFFFFFF0FFF00FFFFFFFF83FFFFFFFFFFFFFFFFFFFFC1FFFE03C1FFFFFFFFFF0FFE007FFFFFFF81FFFFFFFFFFFFFFFFFFFFC1FFFF07C1FFFFFFFFFF0FFE007FFFFFFF81FFFFFFFFFFFFFFFFFFFFC1FFFF8FC1FFFFFFFFFF0FFC003FFFFFFF81FFFFFFFFFFFFFFFFFFFFC1FFFFFFC1FFFFFFFFFF0FFC003FFFFFFF81FFFE7FFFFCFF9FFFF9FFC1E7FFFFC1FFCFFFF1FF0FFC183FE0FE0C0007F007F8201C03FF803FC180FF07C1FC01FF801F0FF8181FE0FC0C0007C003F8000801FF000FC0003F07C1F800FE00070FF83C1FE0FC0C00078001F8000000FC0007C0001F07C1F0007E000F0FF03C0FE0FC0C00070000F80000007C0003C0001F07C1E0003C000F0FF03C0FE0FC0E000F01C0780E00C0780E03C0380F07C1E0781C0F8F0FF07E0FE0FC0F83FE07E0781F03E0781F81C0FC0F07C1C0FC1C0FFF0FE07E07E0FC0F81FE07F0383F03F0703F81C0FE0707C1C0FC1C01FF0FE00007E0FC0F81FE0FF0383F03F0703FC1C1FE0707C1C0001C001F0FC00003E0FC0F81FE0FF8383F03F0703FC1C1FE0707C1C0000E000F0FC00003E0FC0F81FE0FF0383F03F0703FC1C1FE0707C1C0001F00070FC00003E0FC0F81FE0FF0383F03F0703FC1C0FE0707C1C0001FE0070F800001E0FC0F81FE07F0783F03F0783F81C0FE0F07C1C0FFFFFE070F81FF81E0781F81EF03C0783F03F0780F03C0780F07C1E07CFE7F070F83FFC1F0001FC0070000783F03F0780003C0000F07C1E0007C00070F03FFC0F0003FC0078000F83F03F07C0007C0001F07C1F0003C00070F03FFC0F8003FE003C001F83F03F07E000FC0003F07C1F8003C000F0E07FFE07C00FFE007E003F83F03F07F001FC0007F07C1FC007C001F0F0FFFF0FF01FFF81FF81FFC7F87F8FFC07FE1C1FF8FC3FF01FF807F0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0"


# ---------------------------------------------------------------------------
# Construction du ZPL
# ---------------------------------------------------------------------------
def build_zpl(or_number: str, magasinier: str) -> str:
    """Construit le ZPL d'une etiquette 105x53mm paysage."""
    dpm = LABEL_DPI / 25.4
    def d(mm):  # millimetres -> dots
        return round(mm * dpm)

    PW  = d(105)   # largeur etiquette
    LL  = d(53)    # hauteur etiquette
    MAR = d(3)     # marge laterale

    # --- Bandeau superieur ---
    HDR_H = d(13)

    # Logo : hauteur cible 9mm, largeur proportionnelle
    logo_h = d(9)
    logo_w = round(_LOGO_W * logo_h / _LOGO_H)
    logo_scale_x = max(1, round(logo_w / _LOGO_W)) if logo_w >= _LOGO_W else 1
    logo_scale_y = max(1, round(logo_h / _LOGO_H)) if logo_h >= _LOGO_H else 1
    # Pour un rendu fidele, on calcule un facteur d'agrandissement entier
    # le plus proche, sinon 1 (le logo est deja a la bonne resolution ~30mm).
    logo_x = MAR
    logo_y = (HDR_H - _LOGO_H) // 2
    if logo_y < d(1):
        logo_y = d(1)

    # Boite RC (a droite du bandeau)
    rc_w = d(14)
    rc_h = d(10)
    rc_t = max(3, d(0.7))
    rc_x = PW - rc_w - MAR
    rc_y = (HDR_H - rc_h) // 2
    rc_font_h = d(7)
    rc_font_w = d(6)
    rc_text_y = rc_y + (rc_h - rc_font_h) // 2

    # --- Traits separateurs ---
    sep1_y = HDR_H
    sep1_h = max(4, d(1.0))

    sep2_y = d(43)
    sep2_h = max(2, d(0.4))

    # --- Numero OR (centre dans le corps) ---
    body_top = sep1_y + sep1_h
    body_bot = sep2_y
    body_h   = body_bot - body_top

    # Taille adaptee au nombre de chiffres pour rester dans la largeur
    n = len(or_number)
    if   n <= 2: or_font_h = d(20)
    elif n == 3: or_font_h = d(19)
    elif n == 4: or_font_h = d(17)
    elif n == 5: or_font_h = d(15)
    else:        or_font_h = d(13)
    or_font_w = round(or_font_h * 0.78)
    or_y = body_top + (body_h - or_font_h) // 2

    # --- Pied de page ---
    foot_top  = sep2_y + sep2_h
    foot_h    = LL - foot_top
    foot_font_h = d(2.6)
    foot_font_w = d(1.9)
    foot_text_y = foot_top + (foot_h - foot_font_h) // 2

    now_str = datetime.datetime.now().strftime("%d/%m/%Y  %H:%M")

    # Telechargement du logo dans la RAM de l'imprimante
    logo_download = "~DGR:LOGO.GRF,{t},{b},{h}".format(
        t=_LOGO_TOTAL, b=_LOGO_BPR, h=_LOGO_HEX
    )

    parts = [
        logo_download,
        "^XA",
        "^CI28",                 # UTF-8
        "^PW{}".format(PW),
        "^LL{}".format(LL),
        "^LH0,0",

        # Logo
        "^FO{x},{y}^XGR:LOGO.GRF,1,1^FS".format(x=logo_x, y=logo_y),

        # Boite RC
        "^FO{x},{y}^GB{w},{h},{t}^FS".format(x=rc_x, y=rc_y, w=rc_w, h=rc_h, t=rc_t),
        "^FO{x},{y}^A0N,{fh},{fw}^FB{w},1,0,C^FD{txt}^FS".format(
            x=rc_x, y=rc_text_y, fh=rc_font_h, fw=rc_font_w, w=rc_w, txt=magasinier),

        # Trait epais
        "^FO0,{y}^GB{w},{h},{h}^FS".format(y=sep1_y, w=PW, h=sep1_h),

        # OR centre
        "^FO0,{y}^A0N,{fh},{fw}^FB{w},1,0,C^FD{txt}^FS".format(
            y=or_y, fh=or_font_h, fw=or_font_w, w=PW, txt=or_number),

        # Trait fin
        "^FO0,{y}^GB{w},{h},{h}^FS".format(y=sep2_y, w=PW, h=sep2_h),

        # Pied gauche : libelle
        "^FO{x},{y}^A0N,{fh},{fw}^FDORDRE DE REPARATION^FS".format(
            x=MAR, y=foot_text_y, fh=foot_font_h, fw=foot_font_w),

        # Pied droite : date/heure
        "^FO0,{y}^A0N,{fh},{fw}^FB{w},1,0,R^FD{txt}^FS".format(
            y=foot_text_y, fh=foot_font_h, fw=foot_font_w, w=PW - MAR, txt=now_str),

        "^XZ",
    ]
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Impression
# ---------------------------------------------------------------------------
def print_copies(or_number: str, copies: int, magasinier: str) -> None:
    """Envoie le ZPL a l'imprimante Windows (mode RAW), ou en console si indispo."""
    zpl = build_zpl(or_number, magasinier)

    try:
        import win32print
    except ImportError:
        log.warning("win32print indisponible - impression en console (mode dev)")
        for i in range(copies):
            print("\n" + "=" * 60)
            print("[ETIQUETTE {}/{}]  OR={}  mag={}".format(i + 1, copies, or_number, magasinier))
            print(zpl)
            print("=" * 60)
        return

    printer = PRINTER_NAME or win32print.GetDefaultPrinter()
    log.info("Impression OR=%s x%d sur [%s]", or_number, copies, printer)

    for i in range(copies):
        handle = win32print.OpenPrinter(printer)
        try:
            win32print.StartDocPrinter(handle, 1, ("APV-OR-{}-{}".format(or_number, i + 1), None, "RAW"))
            win32print.StartPagePrinter(handle)
            win32print.WritePrinter(handle, zpl.encode("utf-8"))
            win32print.EndPagePrinter(handle)
            win32print.EndDocPrinter(handle)
        finally:
            win32print.ClosePrinter(handle)

    log.info("OK - %d etiquette(s) imprimee(s) pour OR=%s", copies, or_number)


# ---------------------------------------------------------------------------
# Google Sheets
# ---------------------------------------------------------------------------
def connect() -> "gspread.Worksheet":
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(SPREADSHEET_ID)
    return sheet.worksheet(WORKSHEET_NAME)


def fetch_pending(ws) -> list:
    """Retourne [(ligne, or, copies, magasinier), ...] des lignes PENDING."""
    rows = ws.get_all_values()
    jobs = []
    for i, row in enumerate(rows):
        if len(row) < COL_STATUS:
            continue
        if row[COL_STATUS - 1].strip().upper() != "PENDING":
            continue
        line   = i + 1
        or_num = row[COL_OR - 1].strip()
        if not or_num:
            continue
        try:
            copies = max(1, int(row[COL_QTY - 1].strip()))
        except (ValueError, IndexError):
            copies = 1
        mag = row[COL_MAG - 1].strip() if len(row) >= COL_MAG and row[COL_MAG - 1].strip() else "RC"
        jobs.append((line, or_num, copies, mag))
    return jobs


def set_status(ws, line: int, status: str) -> None:
    ws.update_cell(line, COL_STATUS, status)


# ---------------------------------------------------------------------------
# Boucle principale
# ---------------------------------------------------------------------------
def main() -> None:
    if not SPREADSHEET_ID:
        log.error("SPREADSHEET_ID non defini. Renseigne-le avant de lancer le daemon.")
        sys.exit(1)

    log.info("=" * 60)
    log.info("APV Rouen - Print Daemon (Godex DT4x)")
    log.info("  Spreadsheet : %s", SPREADSHEET_ID)
    log.info("  Onglet      : %s", WORKSHEET_NAME)
    log.info("  Imprimante  : %s", PRINTER_NAME or "(par defaut)")
    log.info("  Intervalle  : %ds", POLL_INTERVAL)
    log.info("=" * 60)

    ws = None
    while True:
        try:
            if ws is None:
                log.info("Connexion a Google Sheets...")
                ws = connect()
                log.info("Connecte.")

            jobs = fetch_pending(ws)
            if jobs:
                log.info("%d tache(s) en attente", len(jobs))

            for line, or_num, copies, mag in jobs:
                log.info("Traitement ligne %d : OR=%s x%d (%s)", line, or_num, copies, mag)
                try:
                    set_status(ws, line, "PRINTING")
                    print_copies(or_num, copies, mag)
                    set_status(ws, line, "PRINTED")
                    log.info("  -> PRINTED")
                except Exception as exc:
                    log.error("  -> ERROR : %s", exc)
                    traceback.print_exc()
                    try:
                        set_status(ws, line, "ERROR")
                    except Exception:
                        pass

        except gspread.exceptions.APIError as exc:
            log.error("Erreur API Google Sheets : %s", exc)
            ws = None
        except Exception as exc:
            log.error("Erreur inattendue : %s", exc)
            traceback.print_exc()
            ws = None

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
