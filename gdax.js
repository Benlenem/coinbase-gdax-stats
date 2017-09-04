const Gdax = require('gdax');
const Observable = require('rxjs').Observable;
const commandLineArgs = require('command-line-args')

const optionDefinitions = [
  { name: 'apiKey', alias: 'k', type: String },
  { name: 'secret', alias: 's', type: String},
  { name: 'passphrase', alias: 'p', type: String }
]

const options = commandLineArgs(optionDefinitions)

const apiURI = 'https://api.gdax.com';
//const sandboxURI = 'https://api-public.sandbox.gdax.com';

const authedClient = new Gdax.AuthenticatedClient(options.apiKey, options.secret, options.passphrase, apiURI);

Observable.zip(getLastTradeValues(), getAccounts(authedClient))
.map( t => {
  var tradeValues = t[0]
  var accounts = t[1]

  return accounts.map(a => {

    let tradeValue = a.currency == 'EUR' ? 1 : Number.parseFloat(tradeValues.get(a.currency))
    let balance = Number.parseFloat(a.balance) 
    let total = balance * tradeValue
    console.log(a.currency + " " + balance + " " + tradeValue + " = " + total)
    return total
  }).reduce((x, y) => x + y, 0)
})
.subscribe( total => console.log("Total: " + total + " EUR"), err => console.log(err) )

function getAccounts(client){
  return Observable.create( obs => {
    client.getAccounts((error, response, data) => {
      if (error) {
        obs.error(error)
      } else {
        obs.next(data)
      }
    });
  })
}

function getLastTradeValues(){
  return Observable.merge(
    getLastTradeValue(new Gdax.PublicClient('LTC-EUR'), 'LTC'),
    getLastTradeValue(new Gdax.PublicClient('BTC-EUR'), 'BTC'),
    getLastTradeValue(new Gdax.PublicClient('ETH-EUR'), 'ETH'),
  ).toArray()
  .map( array => new Map(array.map((i) => [i.currency, i.value])))
}

function getLastTradeValue(client, currency){
  return Observable.create( obs => {
    client.getProductTicker((error, response, data) => {
      if (error) {
        obs.error(error)
      } else {
        obs.next( {currency: currency, value: data.price } )
        obs.complete()
      }
    });
  })
}