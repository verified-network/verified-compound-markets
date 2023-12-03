
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/verified-network/payments',
    cache: new InMemoryCache(),
});


export default client;
