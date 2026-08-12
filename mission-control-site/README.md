# ImpactOne Mission Control Site

Standalone private dashboard that reads the existing local ImpactOne backend. It does not modify or embed the application.

Run it from the repository root:

```powershell
node mission-control-site/server.js
```

Open `http://127.0.0.1:5175/`.

It reads quotes, market sentiment, agent status, and today’s brief from the backend at `http://127.0.0.1:5000`. Each unavailable source is displayed honestly as unavailable.
