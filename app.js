const express = require('express');
const fs = require('fs');

const app = express();
const PORT = 3000;

class BankAccount {
  constructor(id, name, gender, dob, email, mobile, address, initialBalance, adharNo, panNo) {
    this.id = id;
    this.name = name;
    this.gender = gender;
    this.dob = dob;
    this.email = email;
    this.mobile = mobile;
    this.address = address;
    this.initialBalance = initialBalance;
    this.adharNo = adharNo;
    this.panNo = panNo;
    this.transactions = [];
  }

  deposit(amount) {
    this.initialBalance += amount;
    this.transactions.push({
      type: 'deposit',
      amount: amount,
      date: new Date()
    });
    return this.initialBalance;
  }

  withdraw(amount) {
    if (amount > this.initialBalance) {
      throw new Error('Insufficient balance');
    }
    this.initialBalance -= amount;
    this.transactions.push({
      type: 'withdraw',
      amount: amount,
      date: new Date()
    });
    return this.initialBalance;
  }

  transferMoney(toName, amount) {
    if (amount > this.initialBalance) {
      throw new Error('Insufficient balance');
    }
    const transaction = {
      type: 'transfer',
      amount: amount,
      toName: toName,
      date: new Date()
    };
    this.initialBalance -= amount;
    this.transactions.push(transaction);
    return transaction;
  }

  receiveMoney(fromName, amount) {
    const transaction = {
      type: 'receive',
      amount: amount,
      fromName: fromName,
      date: new Date()
    };
    this.initialBalance += amount;
    this.transactions.push(transaction);
    return transaction;
  }

  getBalance() {
    return this.initialBalance;
  }

  getTransactions() {
    return this.transactions;
  }
}

app.use(express.json());

// create account
app.post('/accounts', (req, res) => {
    const { id, name, gender, dob, email, mobile, address, initialBalance, adharNo, panNo } = req.body[0] || {};
  
    if (!id || !name || !gender || !dob || !email || !mobile || !address || !initialBalance || !adharNo || !panNo) {
      return res.status(400).json({ error: 'All fields are required' });
    }
  
    const newAccount = new BankAccount(id, name, gender, dob, email, mobile, address, initialBalance, adharNo, panNo);
  
    const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    data.push(newAccount);
    fs.writeFileSync('accounts.json', JSON.stringify(data));
  
    res.status(201).json(newAccount);
  });


  //update kyc details

  app.patch('/accounts/:id', (req, res) => {
    const { name, dob, email, mobile, adharNo, panNo } = req.body;
  
    const accountId = req.params.id;
  
    const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    const account = data.find(acc => acc.id === accountId);
  
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
  
    account.name = name || account.name;
    account.dob = dob || account.dob;
    account.email = email || account.email;
    account.mobile = mobile || account.mobile;
    account.adharNo = adharNo || account.adharNo;
    account.panNo = panNo || account.panNo;
  
    fs.writeFileSync('accounts.json', JSON.stringify(data));
  
    res.status(200).json(account);
});

//get account
app.get('/account/:id', (req, res) => {
  const { id } = req.params;

  const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
  const account = data.find(acc => acc.id === id);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json(account);
});

//deposit money
app.put('/account/:id/deposit', (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
  
    const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    const accountIndex = data.findIndex(acc => acc.id === id);
  
    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }
  
    const accountData = data[accountIndex];
    const account = new BankAccount(
      accountData.id,
      accountData.name,
      accountData.gender,
      accountData.dob,
      accountData.email,
      accountData.mobile,
      accountData.address,
      accountData.initialBalance,
      accountData.adharNo,
      accountData.panNo
    );
    account.deposit(amount);
  
    data[accountIndex] = account;
    fs.writeFileSync('accounts.json', JSON.stringify(data));
  
    res.json({ message: 'Deposit successful' });
  });
  
  //withdraw money

    app.put('/account/:id/withdraw', (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
  
    const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    const accountIndex = data.findIndex(acc => acc.id === id);
  
    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }
  
    const accountData = data[accountIndex];
    const account = new BankAccount(
      accountData.id,
      accountData.name,
      accountData.gender,
      accountData.dob,
      accountData.email,
      accountData.mobile,
      accountData.address,
      accountData.initialBalance,
      accountData.adharNo,
      accountData.panNo
    );
  
    try {
      account.withdraw(amount);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  
    data[accountIndex] = account;
    fs.writeFileSync('accounts.json', JSON.stringify(data));
  
    res.json({ message: 'Withdrawal successful' });
});
  
// transfer money  
app.post('/account/:id/transfer', (req, res) => {
    const { id } = req.params;
    const { toName, amount } = req.body;
  
    const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    const fromAccountIndex = data.findIndex(acc => acc.id === id);
  
    if (fromAccountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }
  
    const fromAccountData = data[fromAccountIndex];
    const fromAccount = new BankAccount(
      fromAccountData.id,
      fromAccountData.name,
      fromAccountData.gender,
      fromAccountData.dob,
      fromAccountData.email,
      fromAccountData.mobile,
      fromAccountData.address,
      fromAccountData.initialBalance,
      fromAccountData.adharNo,
      fromAccountData.panNo
    );
  
    const toAccountIndex = data.findIndex(acc => acc.name === toName);
  
    if (toAccountIndex === -1) {
      return res.status(404).json({ error: 'Destination account not found' });
    }
  
    const toAccountData = data[toAccountIndex];
    const toAccount = new BankAccount(
      toAccountData.id,
      toAccountData.name,
      toAccountData.gender,
      toAccountData.dob,
      toAccountData.email,
      toAccountData.mobile,
      toAccountData.address,
      toAccountData.initialBalance,
      toAccountData.adharNo,
      toAccountData.panNo
    );
  
    try {
      const transaction = fromAccount.transferMoney(toAccount.name, amount);
      toAccount.receiveMoney(fromAccount.name, amount);
  
      data[fromAccountIndex] = fromAccount;
      data[toAccountIndex] = toAccount;
  
      fs.writeFileSync('accounts.json', JSON.stringify(data));
  
      res.json({
        message: 'Transfer successful',
        transaction
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });
  
  
  app.post('/account/:id/receive', (req, res) => {
    const { id } = req.params;
    const { fromName, amount } = req.body;
  
    const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    const toAccountIndex = data.findIndex(acc => acc.id === id);
  
    if (toAccountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }
  
    const toAccount = data[toAccountIndex];
    const fromAccountIndex = data.findIndex(acc => acc.name === fromName);
  
    if (fromAccountIndex === -1) {
      return res.status(404).json({ error: 'Sender account not found' });
    }
  
    const fromAccount = data[fromAccountIndex];
    const transferResult = fromAccount.transferMoney(toAccount.name, amount);
  
    if (transferResult.error) {
      return res.status(400).json({ error: transferResult.error });
    }
  
    data[fromAccountIndex] = fromAccount;
    data[toAccountIndex] = toAccount;
    fs.writeFileSync('accounts.json', JSON.stringify(data));
  
    res.json({ message: 'Received funds successfully' });
  });
  
  


  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });