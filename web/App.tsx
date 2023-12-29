import '../styles/main.scss';
import { RPC } from '@compound-finance/comet-extension';
import { useEffect, useMemo, useState } from 'react';
import Comet from '../abis/Comet';
import { Network, NetworkConfig, getNetworkById, getNetworkConfig } from './Network';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { CircleCheckmark } from './Icons/CircleCheckmark';


import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Issuer from './issuer';
import Providers from './provider';

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

export function App<N extends Network>({ rpc, web3, account, networkConfig }: AppPropsExt<N>) {
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
		<BrowserRouter>
			<div className="page home">
				<div className="container">
					<div className="masthead L1">
						<h1 className="L0 heading heading--emphasized">Verified RWA Markets</h1>
						{accountState.extEnabled ?
							<button className="button button--large button--supply" onClick={disableExt}>
								<CircleCheckmark />
								<label>Enabled</label>
							</button> :
							<button className="button button--large button--supply" onClick={enableExt}>Enable</button>}
					</div>

				</div>

				<Routes>
					<Route path="/" element={<Providers />}> </Route>
					<Route path="/issue" element={<Issuer />}> </Route>
				</Routes>

			</div>
		</BrowserRouter>
	);
};

export default ({ rpc, web3 }: AppProps) => {
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