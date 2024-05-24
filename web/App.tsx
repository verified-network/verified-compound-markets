import '../styles/main.scss';
import { CircleCheckmark } from './Icons/CircleCheckmark';
import { BrowserRouter , Routes, Route } from 'react-router-dom';
import Issuer from './issuer';
import Providers from './provider';
import { useWeb3Modal } from "@web3modal/wagmi/react";
import {
  useAccount,
  useConnectorClient,
} from "wagmi";
import Web3 from 'web3';
import { providers } from 'ethers';


export function App() {

  const { open } = useWeb3Modal();
  const { address, isConnected, chainId, isConnecting } = useAccount();
  const account = address;
  const { data: client } = useConnectorClient({ chainId });
  const { chain, transport } = client || { chain: null, transport: null };
  let network;
  if(chain) {
    network = {
      chainId: chain?.id,
    name: chain?.name,
    ensAddress: chain?.contracts?.ensRegistry?.address,
    }
  }
  let web3, signer;
  if (transport && transport.type === "fallback") {
    web3 =  new Web3(transport.transports[0].value?.url);
    const provider = new providers.Web3Provider(transport, network);
    signer = provider.getSigner(address)
  }else if(transport) {
    web3 = new Web3(transport)
    const provider = new providers.Web3Provider(transport, network);
    signer = provider.getSigner(address)
  }


  return (
    <BrowserRouter>
    <div className="page home">
      <div className="container">
        <div className="masthead L1">
          <h1 className="L0 heading heading--emphasized">Verified RWA Markets</h1>
          { !account ?
            <button className="button button--large button--supply" 
            style={{width: "fit-content", position: "absolute", top: "10px", right: "10px"}} 
            onClick={() => open({view: "Networks"})}>Connect Wallet</button> : 
            <button className="button button--large button--supply" 
            style={{width: "fit-content", position: "absolute", top: "10px", right: "10px"}} 
            onClick={() => open()}>Disconnect</button>
             }
        </div>
        
      </div>
      
      <Routes>
     
      <Route path="/" element={<Providers web3={web3} account={account} chainId={chainId} signer={signer} />}> </Route>
        <Route path="/issue" element={<Issuer web3={web3} account={account} chainId={chainId} signer={signer} />}> </Route>

      </Routes>
      
    </div>
    </BrowserRouter>
  );
};