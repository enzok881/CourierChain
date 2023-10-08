const Fastify = require('fastify');
const support = require('@openzeppelin/defender-relay-client/lib/ethers');
const ethers = require('ethers');
const Shipment = require('./artifacts/contracts/Shipment.sol/Shipment.json');

const app = Fastify({ logger: true });

/**
 * @typedef {import('./typechain-types/contracts/Shipment.ts').Shipment} Shipment
 */
async function main() {
  app.post('/tracks', async (request, reply) => {
    const contractAddress = '0xC5670C7941ac69B07616dA708a5Ade679af894B8';
    
    /**
     * @type {import('@openzeppelin/defender-relay-client').RelayerParams}
     */
    const credentials = { 
      apiKey: process.env.DEFENDER_API_KEY,
      apiSecret: process.env.DEFENDER_API_SECRET,
    };

    const provider = new support.DefenderRelayProvider(credentials);

    const signer = new support.DefenderRelaySigner(relayer, provider);

    /**
     * @type {Shipment}
     */
    const contract = new ethers.Contract(contractAddress, Shipment.abi, signer);
    const { orderAmount, trackNumber, orderNumber, courier, currencyCode } = request.body;

    const tx = await contract.createTrack(orderAmount, trackNumber, orderNumber, courier, currencyCode);

    return reply.send(tx);
  });

  app.post('/notifications', async (request, reply) => {
    const fs = require('fs/promises');

    await fs.appendFile('notifications.json', JSON.stringify(request.body, null, 2), { encoding: 'utf-8'});

    reply.send(request.body);
  });

  await app.listen({ port: 3000 });
}

main().catch(console.error);