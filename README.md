# Handle

Claim a .bot name that points at your address. First come, first served, and permanent.

**The one transaction:** `register(string name)`

### Bohr testnet (968) — live

| | |
|---|---|
| Contract | [`0x57cA7509D04a812F3F4dcBA59ac7dee762c62AcC`](https://scan.bohr.life/address/0x57cA7509D04a812F3F4dcBA59ac7dee762c62AcC) · source verified |
| Deploy block | 27061721 |

### BOT Chain mainnet (677) — not yet deployed

Mainnet is the only network the listing bar accepts. The site currently targets Bohr, and the
network badge reads **Testnet** in amber so a screenshot from it can never be mistaken for
listing proof.

---

## How names work

Lowercase letters, digits and interior hyphens, 3 to 32 characters. No expiry, no renewal fee, no
auctions — a name is claimed once and held until its owner transfers it.

That removes a whole category of things that can go wrong: a name silently lapsing, a renewal
nobody saw. The cost is permanent squatting, which is the honest trade.

Uppercase is **rejected**, not folded. Folding would mean the name stored on chain is not the one
you typed, and every consumer would have to know to fold too. One spelling per name is what stops
two names looking identical and resolving differently.

Your first name automatically becomes your primary, so registering your only name does not then
need a second transaction for it to resolve back to you.

**Measured:** `register()` costs 57,571 gas. 23 tests.

## Development

```bash
npm install
npm run chain:check          # both BOT Chain networks: ID, head age, gas price
npm test                     # unit tests and the render-loop lint rule
npm run test:integration     # the ABI against the real contract on anvil, where present
npm run dev

cd contracts && forge test -vv
```

## Deploying

Put `DEPLOYER_PRIVATE_KEY` in `.env` (gitignored, `0x` prefix optional), then:

```bash
cd contracts
./deploy.sh bohr --dry     # simulate, broadcast nothing
./deploy.sh bohr           # testnet
./deploy.sh botchain       # mainnet — real BOT, no faucet
```

The wrapper asks the node what chain it is on and refuses to broadcast if it disagrees with the
network named — the one mistake here that cannot be undone. It then verifies the source on the
explorer, reading the contract's name from the broadcast log rather than guessing it from a
filename.

## Built from the template

`../template`, extracted from `ST-Frontier/ghost-pay`. See `../TEMPLATE.md`.
