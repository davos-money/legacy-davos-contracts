# IKKA

`cp .env.example .env`
edit .env with your variables 

## Contracts

### MakerDAO contracts
* **abaci** — price decrease function for auctions
* **clip** — liquidation 2.0 mechanics
* **dog** — starts auctions
* **join** — ERC20 token adapters
* **jug** — stability fee collector
* **spot** — oracle price fetch
* **sikka** — stable coin
* **vat** — core cdp vault
* **vow** — vault balance sheet. Keeps track of surplus&debt

### Rewards contracts
* **IkkaRewards** — rewards distribution module
* **IkkaToken** — rewards token
* **IkkaOracle** - rewards token oracle

### Ceros
* **CerosRouter** — finds the best way to obtain aMATICc.
* **CeToken** — underlying collateral token inside makerDao
* **CeVault** — stores obtained aMATICc
* **IkkaProvider** — wraps MATIC into ceaMATICc via _CerosRouter_

### Interaction
* **Interaction** — proxy for makerDao contracts. 
Provide deposit&withdraw and borrow&payback functions for end users
* **AuctionProxy** — entrypoint for auction methods.
End users can start auctions and participate in it via this contract
