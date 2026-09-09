// server/tunnel.js
import localtunnel from 'localtunnel';

const PORT = process.env.PORT || 5000;
const SUBDOMAIN = process.env.SUBDOMAIN || 'krishi-slot-portal';

async function startTunnel() {
  try {
    console.log(`Starting secure public tunnel on port ${PORT}...`);
    const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });

    console.log(`\n======================================================`);
    console.log(`🌐 KrishiSlot is LIVE on the internet!`);
    console.log(`🔗 Public URL: ${tunnel.url}`);
    console.log(`======================================================\n`);

    tunnel.on('close', () => {
      console.log('Tunnel connection closed. Reconnecting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      tunnel.close();
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
