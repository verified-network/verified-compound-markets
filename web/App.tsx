// import '../styles/main.scss';
import { RPC } from '@compound-finance/comet-extension';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { CTokenSym, Network, NetworkConfig, getNetwork, getNetworkById, getNetworkConfig, isNetwork, showNetwork } from './Network';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract, ContractInterface } from '@ethersproject/contracts';
import { Close } from './Icons/Close';
import { CircleCheckmark } from './Icons/CircleCheckmark';


import { BrowserRouter , Routes, Route } from 'react-router-dom';
import Issuer from './issuer';
import Providers from './provider';

interface AppProps {
  rpc?: RPC,
  web3: JsonRpcProvider
}

type AppPropsExt<N extends Network> = AppProps & {
  account: string,
  networkConfig: NetworkConfig<N>
  chainId: number | null,
}

interface AccountState<Network> {
  extEnabled: boolean;
}

function usePoll(timeout: number) {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let t: NodeJS.Timer;
    function loop(x: number, delay: number) {
      t = setTimeout(() => {
        requestAnimationFrame(() => {
          setTimer(x);
          loop(x + 1, delay);
        });
      }, delay);
    }
    loop(1, timeout);
    return () => clearTimeout(t)
  }, []);

  return timer;
}

function useAsyncEffect(fn: () => Promise<void>, deps: any[] = []) {
  useEffect(() => {
    (async () => {
      await fn();
    })();
  }, deps);
}

export function App<N extends Network>({rpc, web3, account, networkConfig, chainId}: AppPropsExt<N>) {
  let { cTokenNames } = networkConfig;

  const signer = useMemo(() => {
    return web3.getSigner().connectUnchecked();
  }, [web3, account]);



  return (
    <BrowserRouter>
    <div className="page home">
      <div className="container">
        <div className="masthead L1">
          <h1 className="L0 heading heading--emphasized">Verified RWA Markets</h1>
          {/* { account ?
            <button className="button button--large button--supply" onClick={enableExt}>Connect Wallet</button> : 
            <button className="button button--large button--supply" onClick={enableExt}>Disconnect</button>
             } */}
        </div>
        
      </div>
      
      <Routes>
     
      <Route path="/" element={<Providers web3={web3} account={account} chainId={chainId} signer={signer}/>}> </Route>
      <Route path ="/issue" element={ <Issuer web3={web3} account={account} chainId={chainId} signer={signer}/>}> </Route>

      </Routes>
      
    </div>
    </BrowserRouter>
  );
};

export default ({rpc, web3}: AppProps) => {
  let timer = usePoll(10000);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig<Network> | 'unsupported' | null>(null);

  useAsyncEffect(async () => {
    let accounts = await web3.listAccounts();
    if (accounts.length > 0) {
      let [account] = accounts;
      setAccount(account);
    }
  }, [web3, timer]);

  useAsyncEffect(async () => {
    let networkWeb3 = await web3.getNetwork();
    setChainId(networkWeb3.chainId);
    let network = getNetworkById(networkWeb3.chainId);
    if (network) {
      setNetworkConfig(getNetworkConfig(network));
    } else {
      setNetworkConfig('unsupported');
    }
  }, [web3, timer]);

  if (networkConfig && account) {
    if (networkConfig === 'unsupported') {
      return <div>Unsupported network...</div>;
    } else {
      return <App rpc={rpc} web3={web3} account={account} networkConfig={networkConfig} chainId={chainId} />;
    }
  } else {
    return <div>Loading...</div>;
  }
};