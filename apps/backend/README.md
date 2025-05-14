## Why a backend stack?

This is our server stack built in Supabase which you can also run locally or self-host.

Used to enable online capabilities such as managing users, collaborating, persisting data, etc.

We will offer this as a hosted instance at some point. Ideally, the product should still work offline with no backend connection.

## Usage

### Running locally

1. Make sure you have [Docker] installed
2. Install necessary packages

```bash
npm install
```

3. Run the supabase instance locally

```bash
npm run start
```

4. Set up the latest snapshot of the database

```bash
npm run reset
```
