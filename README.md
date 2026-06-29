This is intended to be a text-based life simulator.

Stack:

- Kuzu, an embedded graph database (https://docs.kuzudb.com/) that allows state to be saved locally
- Optional backup and restore from Google Drive
- Frontend with Vue.js (Vite)
- Planned (near future): package the app as a desktop Electron app so the embedded Kùzu database and backend run in-process, with no separate server to start