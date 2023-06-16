import '../styles/main.scss';
import { RPC } from '@compound-finance/comet-extension';
import { Fragment, useEffect, useMemo, useState } from 'react';
import ERC20 from '../abis/ERC20';
import Comet from '../abis/Comet';
import { CTokenSym, Network, NetworkConfig, getNetwork, getNetworkById, getNetworkConfig, isNetwork, showNetwork } from './Network';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract, ContractInterface } from '@ethersproject/contracts';
import { Close } from './Icons/Close';
import { CircleCheckmark } from './Icons/CircleCheckmark';

interface AppProps {
  rpc?: RPC,
  web3: JsonRpcProvider
}

type AppPropsExt<N extends Network> = AppProps & {
  account: string,
  networkConfig: NetworkConfig<N>
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



export function App<N extends Network>({rpc, web3, account, networkConfig}: AppPropsExt<N>) {
  let { cTokenNames } = networkConfig;

  const signer = useMemo(() => {
    return web3.getSigner().connectUnchecked();
  }, [web3, account]);

  const initialAccountState = () => ({
    extEnabled: false,
  });
  const [accountState, setAccountState] = useState<AccountState<Network>>(initialAccountState);

  const ext = useMemo(() => new Contract(networkConfig.extAddress, networkConfig.extAbi, signer), [signer]);
  const comet = useMemo(() => new Contract(networkConfig.rootsV3.comet, Comet, signer), [signer]);

  async function enableExt() {
    console.log("enabling ext");
    await comet.allow(ext.address, true);
    console.log("enabled ext");
  }

  async function disableExt() {
    console.log("disabling ext");
    await comet.allow(ext.address, false);
    console.log("disabling ext");
  }

  return (
    <div className="page home">
      <div className="container">
        <div className="masthead L1">
          <h1 className="L0 heading heading--emphasized">My Comet Extension</h1>
          { accountState.extEnabled ?
            <button className="button button--large button--supply" onClick={disableExt}>
              <CircleCheckmark />
              <label>Enabled</label>
            </button> :
            <button className="button button--large button--supply" onClick={enableExt}>Enable</button> }
        </div>
        <div className="home__content">
          <div className="home__assets">
            <div className="panel panel--assets">
              <div className="panel__header-row">
                <label className="L1 label text-color--1">My Extension Dashboard</label>
              </div>
              <div className="panel__header-row">
                <label className="label text-color--1">
                  A dashboard to control how a user utilizes your extension.
                </label>
              </div>
              { null }
              <div className="panel__header-row">
                <label className="L1 label text-color--2">Debug Information</label>
                <label className="label text-color--2">
                  network={ showNetwork(networkConfig.network) }<br/>
                  account={ account }<br/>
                </label>
              </div>
            </div>
          </div>
          <div className="home__sidebar">
            <div className="position-card__summary">
              <div className="panel position-card L3">
                <div className="panel__header-row">
                  <label className="L1 label text-color--1">Summary</label>
                </div>
                <div className="panel__header-row">
                  <p className="text-color--1">
                    Further information about your extension.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ({rpc, web3}: AppProps) => {
  let timer = usePoll(10000);
  const [account, setAccount] = useState<string | null>(null);
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
      return <App rpc={rpc} web3={web3} account={account} networkConfig={networkConfig} />;
    }
  } else {
    return <div>Loading...</div>;
  }
};
