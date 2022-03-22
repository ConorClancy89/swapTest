import React, {useState, useEffect} from 'react'
import {ethers} from 'ethers'
import detectEthereumProvider from "@metamask/detect-provider";
import {ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent} from '@uniswap/sdk'
import './WalletCard.css'

const WalletCardEthers = () => {

	const [errorMessage, setErrorMessage] = useState(null);
	const [defaultAccount, setDefaultAccount] = useState(null);
	const [userBalance, setUserBalance] = useState(null);
	const [connButtonText, setConnButtonText] = useState('Connect Wallet');
	const [provider, setProvider] = useState(null);
	const [midprice, setmidprice] = useState(null);
	const [midpriceinv, setmidpriceinv] = useState(null);
	const [exprice, setexprice] = useState(null);

	const chainId = ChainId.RINKEBY;
	const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';
	const routerContractAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';//'0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

	const uniswapRouterAbi = [
		`function swapTokensForExactTokens(
			uint amountOut,
			uint amountInMax,
			address[] calldata path,
			address to,
			uint deadline
		  ) external returns (uint[] memory amounts)`,
		'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
	];

	const ierc20Abi = [
		'function approve(address spender, uint amount) public returns(bool)',
	];
	//const chainId = ChainId.MAINNET;
	//const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

	//const infuraProvider = new providers.InfuraProvider("rinkeby", '8c672c481c70499cbe8d62afdb428090');

	const connectWalletHandler = async () => {

		const provider = await detectEthereumProvider();
		provider
		  .request({ method: "eth_requestAccounts" })
		  .then(handleAccountsChanged)
		  .catch((err) => {
			if (err.code === 4001) {
			  // EIP-1193 userRejectedRequest error
			  // If this happens, the user rejected the connection request.
			  // console.log("Please connect to MetaMask.");
			} else {
			  console.error(err);
			}
		  });

		const web3Provider = new ethers.providers.Web3Provider(provider);

		async function handleAccountsChanged(accounts) {
			if (accounts.length === 0) {
			  // MetaMask is locked or the user has not connected any accounts
			  // console.log("Please connect to MetaMask.");
			  setDefaultAccount(undefined);
			} else if (accounts[0] !== defaultAccount) {
				setDefaultAccount(accounts[0]);
			  if (web3Provider) {
				setConnButtonText('Wallet Connected');
				setDefaultAccount(accounts[0]);
				console.log(accounts[0]);
				getData(web3Provider, accounts[0]);
			  } else {
				// console.log("I am an error");
			  }
			}
		  }

	}

	const getData = async (ethProvider, signerAddress) =>{

		const provider = await detectEthereumProvider();
		const web3Provider = new ethers.providers.Web3Provider(provider, 'rinkeby');
		const uniswapRouter = new ethers.Contract(routerContractAddress, uniswapRouterAbi, web3Provider.getSigner());

		const DAI = await Fetcher.fetchTokenData(chainId, DAIAddress);
		const WETH_DAI = await Fetcher.fetchPairData(DAI, WETH[DAI.chainId]);
		const WETH_TO_DAI = new Route([WETH_DAI], WETH[DAI.chainId]);

		const originContract = new ethers.Contract(WETH[DAI.chainId].address, ierc20Abi, web3Provider.getSigner());

		const amountIn = ethers.utils.parseUnits('0.005', 'ether');

		setmidprice(WETH_TO_DAI.midPrice.toSignificant(6));
		setmidpriceinv(WETH_TO_DAI.midPrice.invert().toSignificant(6));

		const trade = new Trade(WETH_TO_DAI, new TokenAmount(WETH[DAI.chainId], amountIn), TradeType.EXACT_INPUT);
		setexprice(trade.executionPrice.toSignificant(6));

		const path = [WETH[DAI.chainId].address, DAI.address];
		const slippageTolerance = 5;
		const amounts = await uniswapRouter.getAmountsOut(amountIn, path);

		const amountOutMin = amounts[1].sub(amounts[1].div(slippageTolerance));

		const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

		console.log('Before Approve');
		const txAPPROVAL = await originContract.approve(routerContractAddress, amountIn);
		console.log('After Approve');
		const receiptAPPROVAL = await txAPPROVAL.wait();
		console.log('Transaction receipt');
		console.log(receiptAPPROVAL);
		console.log('Run SWAP-TX');

		const txSWAP = await uniswapRouter.swapTokensForExactTokens(
			amountOutMin.toHexString(),
			amountIn.toHexString(),
			path,
			signerAddress,
			deadline
		);

		txSWAP.wait().then(() => {
			console.log("i'm done")
		});

	}



	return (
		<div className='walletCard'>
		<h4> MetaMask & Uniswap SDK demo </h4>
			<button onClick={connectWalletHandler}>{connButtonText}</button>
			<div className='accountDisplay'>
				<h3>Address: {defaultAccount}</h3>
			</div>
			<div className='balanceDisplay'>
				<h3>Balance: {userBalance}</h3>
			</div>
			<div className='balanceDisplay'>
				<h3>Midprice Dai for WETH: {midprice}</h3>
			</div>
			<div className='balanceDisplay'>
				<h3>Midprice WETH for Dai: {midpriceinv}</h3>
			</div>
			<div className='balanceDisplay'>
				<h3>Execution price Dai for WETH: {exprice}</h3>
			</div>
			{errorMessage}
		</div>
	);
}

export default WalletCardEthers;
