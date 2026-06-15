Dim oShell
Set oShell = CreateObject("WScript.Shell")

Dim sDir
sDir = "C:\apv-rouen"

oShell.Environment("PROCESS")("SPREADSHEET_ID")     = "1ga1XcGzIbEektxO_PtI9OPTeT2eR2-innPh4pMKiLTA"
oShell.Environment("PROCESS")("GOOGLE_CREDENTIALS") = sDir & "\service_account.json"
oShell.Environment("PROCESS")("PRINTER_NAME")       = "Godex DT4x"
oShell.Environment("PROCESS")("POLL_INTERVAL")      = "5"
oShell.Environment("PROCESS")("LABEL_DPI")          = "203"

oShell.Run "pythonw """ & sDir & "\print_daemon.py""", 0, False

Set oShell = Nothing
