# SIKKA

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
* **SikkaProvider** — wraps MATIC into ceaMATICc via _CerosRouter_

### Interaction
* **Interaction** — proxy for makerDao contracts. 
Provide deposit&withdraw and borrow&payback functions for end users
* **AuctionProxy** — entrypoint for auction methods.
End users can start auctions and participate in it via this contract


Installation
------------
To run Sikka, pull the repository from GitHub and install its dependencies. You will need [yarn](https://yarnpkg.com/lang/en/docs/install/) or [npm](https://docs.npmjs.com/cli/install) installed.

    git clone https://github.com/sikka-money/sikka-smart-contracts.git
    cd sikka-smart-contracts
    yarn install # or `npm install`

`cp .env.example .env`
edit .env with your variables 


Testing
-------
To run the tests run:

    yarn test

Code Coverage
-------------
To run code coverage, run:

    yarn coverage

