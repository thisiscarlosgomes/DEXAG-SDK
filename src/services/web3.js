import { ethers } from 'ethers';

import api from './api';
import utility from './utility';

const web3 = {
  async setAllowance(tokenContract, exchangeAddress, provider, handler) {
    const uintMax = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    const gasPrice = await api.getGas();
    const txOptions = {
      gasPrice,
    };
    let status;
    try {
      status = await tokenContract.approve(exchangeAddress, uintMax, txOptions);
    } catch(err) {
      handler('rejected');
      return false;
    }
    handler('send_approve', status.hash);
    // wait for mining to finish
    const receipt = await provider.waitForTransaction(status.hash);
    // mined
    handler('mined_approve', status.hash);
    return true;
  },
  async wrap(wethContract, amount, provider, handler) {
    if (amount == 0) {
      return true;
    }
    const value = ethers.utils.bigNumberify(amount.toString());
    const gasPrice = await api.getGas();
    const txOptions = {
      value,
      gasPrice,
    };
    let status;
    try {
      status = await wethContract.deposit(txOptions);
    } catch(err) {
      handler('rejected');
      return false;
    }
    handler('send_wrap', status.hash);
    const receipt = await provider.waitForTransaction(status.hash);
    // wrap mined
    handler('mined_wrap', status.hash);
    return true;
  },
  async unwrap(wethContract, amount) {
    if (amount == 0) {
      return true;
    }
    const gasPrice = await api.getGas();
    const txOptions = {
      gasPrice,
    };
    const amountNumber = ethers.utils.bigNumberify(amount.toString());
    let status;
    try {
      status = await wethContract.withdraw(amountNumber, txOptions);
    } catch(err) {
      handler('rejected');
      return false;
    }
    handler('send_unwrap', status.hash);
    const receipt = await provider.waitForTransaction(status.hash);
    // wrap mined
    handler('mined_unwrap', status.hash);
    return true;
  },
  async estimateGas(trade, provider, signer, handler) {
    try{
      const sender = await signer.getAddress();
      const estimateTx = { ...trade, from: sender };
      const estimate = await provider.estimateGas(estimateTx);
      return parseInt(estimate.toString()) * 1.2;
    }catch(err){
      handler('bad_tx');
      return;
    }
  },
  async sendTrade(trade, provider, signer, handler) {
    const status = await web3._sendTradeInternal(trade, signer, handler);
    if (!status) {
      return;
    }
    handler('send_trade', status.hash);
    const receipt = await provider.waitForTransaction(status.hash);
    if(receipt.status=='0x1'){
      handler('mined_trade', status.hash);
    }else{
      handler('failed', status.hash);
    }
    return status;
  },
  async getERC20Balance(trade, signer) {
    const tokenContract = utility.getTokenContract(trade, signer);
    const address = await signer.getAddress();
    const tokenBalance = await tokenContract.balanceOf(address);
    const tokenAmount = trade.metadata.input.amount;
    return tokenBalance.gte(tokenAmount);
  },
  async getETHBalance(trade, signer) {
    const ethBalance = await signer.getBalance();
    const ethAmount = trade.trade.value;
    return ethBalance.gte(ethAmount);
  },
  async _sendTradeInternal(trade, signer, handler) {
    try{
      const status = await signer.sendTransaction(trade);
      return status;
    }catch(err){
      handler('rejected');
      return;
    }
  },
};

export default web3;
