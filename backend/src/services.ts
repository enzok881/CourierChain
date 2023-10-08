import Web3 from "web3";
import { trackingConfig } from '../config/tracking.config';
import { utils } from 'web3';

export async function updateTrackingOrderTx(params: { 
  id: string, 
  status: number, 
  web3: Web3 
}) {
  const { id, status, web3 } = params;
  const { contractAddress, contractAbi } = trackingConfig;

  const trackingContract = new web3.eth.Contract(contractAbi, contractAddress);
  const privateKey = Buffer.from(process.env.WEB3_PRIVATE_KEY as string, 'hex');
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const method = trackingContract.methods.updateTrackingStatus(id, status);
  const nonce = await web3.eth.getTransactionCount(account.address);

  const tx = await account.signTransaction({
    from: account.address,
    to: contractAddress,
    data: method.encodeABI(),
    maxFeePerGas: 250000000000,
    maxPriorityFeePerGas: 250000000000,
    gas: 100000,
    nonce: utils.toHex(nonce),
  });

  return tx;
}