AMTSCUP KONOLFINGEN 2027 – PROTOTYP

Ziel:
Foto -> KI -> Kontrolle -> Speichern -> Live-Rangliste auf derselben Website.

WICHTIG:
- data.json startet leer.
- Test zunächst nur Feld A.
- Bestehende definitive Ranglistenlogik ist noch NICHT vollständig eingebaut.
- Dieser Prototyp zeigt bewusst zuerst die direkte Datenkette ohne CSV.
- OPENAI_API_KEY bleibt als Render-Umgebungsvariable.
- Für einen echten Dauerbetrieb braucht die Datenhaltung später eine persistente Datenbank; Render-Dateispeicher kann bei Deployments verloren gehen.

UPLOAD AUF GITHUB:
Am einfachsten die Dateien dieses ZIPs in ein NEUES Test-Repository hochladen und als eigenen Render Web Service deployen.
So bleibt die heute funktionierende Seite unangetastet.
