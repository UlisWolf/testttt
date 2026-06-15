Set oShell = CreateObject("WScript.Shell")

' Dossier du projet (adapter si installé ailleurs)
Dim sDir
sDir = "C:\apv-rouen"

' Variables d'environnement
oShell.Environment("PROCESS")("SPREADSHEET_ID")   = "METTEZ_VOTRE_ID_ICI"
oShell.Environment("PROCESS")("GOOGLE_CREDENTIALS") = sDir & "\service_account.json"
oShell.Environment("PROCESS")("PRINTER_NAME")     = ""
oShell.Environment("PROCESS")("POLL_INTERVAL")    = "5"

' Lancer Python en arrière-plan (0 = fenêtre cachée, False = ne pas attendre)
oShell.Run "python """ & sDir & "\print_daemon.py""", 0, False

Set oShell = Nothing
