import React, { useState, useContext, createContext } from "react";
import { providers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";
import detectEthereumProvider from "@metamask/detect-provider";

const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [showModalInfo, setShowModalInfo] = useState(true);

  const [address, setAddress] = useState(undefined);
  const [balance, setBalance] = useState(undefined);
  const [ethProvider, setETHProvider] = useState(undefined);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [isMetamask, setIsMetamask] = useState(undefined);

  const connectWallet = async () => {
    // check if metamask is being used
    setIsMetamask(false);

    // initialize to Web3 backend (infura)
    const provider = new WalletConnectProvider({
      infuraId: process.env.REACT_APP_INFURA_ID,
    });

    //initialize address state
    setAddress(undefined);

    // disconnect if already connected
    await provider.disconnect();

    // make new connection
    await provider.enable();

    // connect to Web3 backend (infura)
    const web3Provider = new providers.Web3Provider(provider);
    setETHProvider(web3Provider);

    const signer = await web3Provider.getSigner();
    console.log(signer);
    const address = await signer.getAddress();
    const balance = await signer.getBalance();
    setAddress(address);
    setBalance(balance);

    const network = await web3Provider.getNetwork();
    setWrongNetwork(
      !(process.env.REACT_APP_NETWORK_ID === "0x" + network.chainId.toString())
    );
  };

  const connectMetaMask = async () => {
    // check if metamask is being used
    setIsMetamask(true);

    const provider = await detectEthereumProvider();
    provider
      .request({ method: "eth_requestAccounts" })
      .then(handleAccountsChanged)
      .catch((err) => {
        if (err.code === 4001) {
          // EIP-1193 userRejectedRequest error
          // If this happens, the user rejected the connection request.
          // console.log("Please connect to MetaMask.");
          setIsMetamask(undefined);
        } else {
          console.error(err);
        }
      });

    const web3Provider = new providers.Web3Provider(provider);

    provider.on("chainChanged", handleChainChanged);
    provider.on("accountsChanged", handleAccountsChanged);

    async function handleAccountsChanged(accounts) {
      if (accounts.length === 0) {
        // MetaMask is locked or the user has not connected any accounts
        // console.log("Please connect to MetaMask.");
        setAddress(undefined);
        setBalance(undefined);
      } else if (accounts[0] !== address) {
        setAddress(accounts[0]);
        if (web3Provider) {
          const signer = await web3Provider.getSigner();
          const balance = await signer.getBalance();
          setBalance(balance);
        } else {
          // console.log("I am an error");
        }
      }
    }

    async function handleChainChanged(_chainId) {
      if (_chainId !== process.env.REACT_APP_NETWORK_ID) {
        setWrongNetwork(true);
        try {
          setAddress(undefined);
          provider
            .request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: process.env.REACT_APP_NETWORK_ID }],
            })
            .then(async () => {
              if (ethProvider){
                const signer = await ethProvider.getSigner();
                const balance = await signer.getBalance();
                setBalance(balance);
              }
            });
        } catch (e) {}
      } else {
        setWrongNetwork(false);
      }
    }

    setETHProvider(web3Provider);

    const chainId = await provider.request({ method: "eth_chainId" });
    await handleChainChanged(chainId);
    const signer = await web3Provider.getSigner();
    const balance = await signer.getBalance();
    setBalance(balance);
  };

  const updateBalance = async () => {
    if (ethProvider) {
      const signer = await ethProvider.getSigner();
      const address = await signer.getAddress();
      const balance = await signer.getBalance();
      setAddress(address);
      setBalance(balance);
    }
  };

  const shortenAddress = (addr) => {
    if (addr !== undefined && addr.startsWith("0x")) {
      const length = addr.length;
      return addr.slice(0, 6) + "..." + addr.slice(length - 4);
    }
    return addr;
  };

  return (
    <AuthContext.Provider
      value={{
        address,
        showModalInfo,
        setShowModalInfo,
        connectWallet,
        connectMetaMask,
        shortenAddress,
        ethProvider,
        balance,
        updateBalance,
        wrongNetwork,
        isMetamask,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};














import React, {useState, useEffect} from 'react'
import {ethers, providers} from 'ethers'
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
	const routerContractAddress = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
	//const chainId = ChainId.MAINNET;
	//const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

	const infuraProvider = new providers.InfuraProvider("rinkeby", '8c672c481c70499cbe8d62afdb428090');

	const connectWalletHandler = () => {
		if (window.ethereum && defaultAccount == null) {
			// set ethers provider
			setProvider(new ethers.providers.Web3Provider(window.ethereum));

			// connect to metamask
			window.ethereum.request({ method: 'eth_requestAccounts'})
			.then(result => {
				setConnButtonText('Wallet Connected');
				setDefaultAccount(result[0]);

			})
			.catch(error => {
				setErrorMessage(error.message);
			});

		} else if (!window.ethereum){
			console.log('Need to install MetaMask');
			setErrorMessage('Please install MetaMask browser extension to interact');
		}

		getData();
	}

	useEffect(() => {
		if(defaultAccount){
		provider.getBalance(defaultAccount)
		.then(balanceResult => {
			setUserBalance(ethers.utils.formatEther(balanceResult));
		})
		};
	}, [defaultAccount]);

	const getData = async () =>{

		const DAI = await Fetcher.fetchTokenData(chainId, DAIAddress, infuraProvider);
		const WETH_DAI = await Fetcher.fetchPairData(DAI, WETH[DAI.chainId], infuraProvider);
		const WETH_TO_DAI = new Route([WETH_DAI], WETH[DAI.chainId]);
		setmidprice(WETH_TO_DAI.midPrice.toSignificant(6));
		setmidpriceinv(WETH_TO_DAI.midPrice.invert().toSignificant(6));

		const trade = new Trade(WETH_TO_DAI, new TokenAmount(WETH[DAI.chainId], '100000000000000'), TradeType.EXACT_INPUT);
		setexprice(trade.executionPrice.toSignificant(6));

		const slippageTolerance = new Percent('50', '10000'); //50bips 1bip=0.001% (0.05%)
		const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
		const path = [WETH[DAI.chainId].address, DAI.address];
		const to = '';
		const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
		const value = trade.inputAmount.raw;

		const uniswap = new ethers.Contract(routerContractAddress, 
		['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'],
		defaultAccount
		);

		console.log(defaultAccount);

		


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