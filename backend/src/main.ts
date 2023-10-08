import { Agenda } from '@hokify/agenda';
import { Relayer } from '@openzeppelin/defender-relay-client';
import { HexString, Web3 } from 'web3';
import { trackingConfig } from '../config/tracking.config';
import Fastify, { FastifyInstance } from 'fastify';
import { updateTrackingOrderTx } from './services';

type JobTrackingOrder = { 
  tx: {
		messageHash: HexString;
		r: HexString;
		s: HexString;
		v: HexString;
		rawTransaction: HexString;
		transactionHash: HexString;
	},
  trackingOrderId: string,
  transactionHash: string,
};

const agenda = new Agenda({ 
  db: { address: process.env.MONGODB_CONNECTION as string } 
});

const relayer = new Relayer({ 
  apiKey: process.env.RELAYER_API_KEY as string, 
  apiSecret: process.env.RELAYER_API_SECRET as string,
});

const server: FastifyInstance = Fastify({
  logger: true,
})

const web3 = new Web3(process.env.WEB3_PROVIDER_URL as string);

agenda.define('check tracking orders', async job => {
  
});

agenda.define<JobTrackingOrder>('process tracking order', async job => {
  const { tx } = job.attrs.data;

  try {
    const receipt = await web3.eth.sendSignedTransaction(tx.rawTransaction as string);

    job.attrs.data.transactionHash = receipt.transactionHash.toString();
  } catch (error) {
    const err = error as Error;

    job.fail(err);
  }

  await job.save();
});

server.get('/', async (request, reply) => {
  return reply.send({ hello: 'world' });
});

server.post('/order-tracking/:id/:status', async (request, reply) => {
  const { id, status } = request.params as { id: string, status: string };
  const { contractAddress, contractAbi } = trackingConfig;

  const statuses = ['ordered', 'shipped', 'delivered', 'failed', 'refunded'];

  if (!statuses.includes(status)) {
    throw new Error('Invalid status');
  }

  const trackingContract = new web3.eth.Contract(contractAbi, contractAddress);
  const orderTracking = await trackingContract.methods.getOrderTracking(id).call();

  if (!orderTracking) {
    throw new Error('Order not found');
  }

  const tx = await updateTrackingOrderTx({
    id: id,
    status: statuses.findIndex(s => s === status),
    web3: web3,
  });

  await agenda.now('process tracking order', {
    trackigOrderId: id,
    tx: tx,
  });

  return reply.send({
    transactionHash: tx.transactionHash,
    proccessing: true 
  });
});

async function main() {
  await server.listen({
    port: 3001,
  });

  await agenda.start();
	await agenda.every('1 hour', 'check tracking orders');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});