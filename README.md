# KrishiSlot

A responsive SIH 2026 demo prototype for reducing farmer wait times at procurement centres. It demonstrates registration-oriented farmer data, slot booking, live queue visibility, SMS/app-style notifications, procurement and payment tracking, and centre-side queue control.

## Run locally

1. Install Node.js 20.19+.
2. In this folder, run `npm install`.
3. Run `npm run dev` and open the shown local address.

To create a deployable build, run `npm run build`. The generated `dist/` folder can be hosted on any static web host.

## Demo paths

- Farmer dashboard, slot booking, live queue, procurements, notifications and profile
- Centre-admin operations view
- Live interaction simulation: booking confirmation, queue advance, alerts and schedule suggestion

## Project structure

```
src/
  data.js      Sample users, slots, queue and procurement data
  main.js      Application state, rendering and interactions
  styles.css   Responsive design system and layouts
```

This front-end prototype uses local sample data. Connect `data.js` interactions to an API, authenticated user session, notification service and payment/procurement system for production deployment.
