Set oShell = CreateObject("WScript.Shell")

Dim sDir
sDir = "C:\apv-rouen"

' ── A CONFIGURER ──────────────────────────────────────────────────────────────
oShell.Environment("PROCESS")("SPREADSHEET_ID")    = "1ga1XcGzIbEektxO_PtI9OPTeT2eR2-innPh4pMKiLTA"
oShell.Environment("PROCESS")("GOOGLE_CREDENTIALS") = sDir & "\service_account.json"
oShell.Environment("PROCESS")("PRINTER_NAME")      = "Godex DT4x"
oShell.Environment("PROCESS")("POLL_INTERVAL")     = "5"

' Resolution DPI de l'imprimante Godex DT4x
' Pour verifier : Panneau de config -> Imprimantes -> clic droit Godex
'                 -> Proprietes d'impression -> Graphiques -> Resolution
' 203 dpi (valeur par defaut sur la plupart des DT4x)
' 300 dpi si votre modele est DT4xW ou configure en haute resolution
oShell.Environment("PROCESS")("LABEL_DPI")         = "203"

' ── LANCEMENT EN ARRIERE-PLAN ─────────────────────────────────────────────────
oShell.Run "pythonw """ & sDir & "\print_daemon.py""", 0, False

Set oShell = Nothing
