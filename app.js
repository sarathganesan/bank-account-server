const express = require('express');
const fs = require('fs');
const http = require('http');
const app = express();
const xlsx = require('xlsx');
const PORT = 4000;


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
    this.closed = false; 
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

  closeAccount() {
    if (this.closed) {
      throw new Error('Account is already closed');
    }
    this.closed = true;
    this.transactions = []; // clear transactions array to disallow future transactions
  }

  printStatement(res) {
    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(this.transactions);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    // Generate the Excel file and save it to disk
    const filePath = `${this.name}_statement.xlsx`;
    XLSX.writeFile(workbook, filePath);

    // Use res.sendFile to send the Excel file as a response
    res.sendFile(filePath, { root: '.' }, (err) => {
      if (err) {
        console.error(`Error sending file: ${err}`);
        res.status(500).send({ error: 'Unable to send file' });
      } else {
        console.log('File sent successfully');
      }
      // Delete the file from disk after sending the response
      fs.unlinkSync(filePath);
    });

    return filePath;
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

app.get('/report', (req, res) => {
  
 // Read data from a JSON file
const jsonData = fs.readFileSync('accounts.json', 'utf8');
const data = JSON.parse(jsonData);


// Create a new workbook
const workbook = xlsx.utils.book_new();

// Add a worksheet for accounts
const accountWorksheet = xlsx.utils.json_to_sheet(data);

// Set column widths for accounts worksheet
const accountColumns = ['A', 'B', 'C', 'D','E','F','G','H','I','J','K'];
const accountColumnWidth = 20;
accountWorksheet['!cols'] = accountColumns.map(() => ({ width: accountColumnWidth }));

// Add the accounts worksheet to the workbook
xlsx.utils.book_append_sheet(workbook, accountWorksheet, 'Accounts');

// Add a worksheet for transactions
const transactionData = data.map(account => {
  return account.transactions.map(transaction => {
    return {
      account: account.id,
     
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date.substr(0, 10),
      toName:transaction.toName,
      fromName:transaction.fromName
    }
  });
}).flat();
const transactionWorksheet = xlsx.utils.json_to_sheet(transactionData);

// Set column widths for transactions worksheet
const transactionColumns = ['A', 'B', 'C', 'D','E','F','G'];
const transactionColumnWidth = 20;
transactionWorksheet['!cols'] = transactionColumns.map(() => ({ width: transactionColumnWidth }));

// Add the transactions worksheet to the workbook
xlsx.utils.book_append_sheet(workbook, transactionWorksheet, 'Transactions');

// Write the workbook to a buffer
const buffer = xlsx.write(workbook, { type: 'buffer' });

// Set the content type and attachment header
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');

// Send the buffer as the response
res.send(buffer);




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
  account.printStatement();

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


// receive money
// receive money
app.post('/account/:id/receive', (req, res) => {
  const { id } = req.params;
  const { fromName, amount } = req.body;

  const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
  const toAccountIndex = data.findIndex(acc => acc.id === id);

  if (toAccountIndex === -1) {
    return res.status(404).json({ error: 'Account not found' });
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

  const fromAccountIndex = data.findIndex(acc => acc.name === fromName);

  if (fromAccountIndex === -1) {
    return res.status(404).json({ error: 'Sender account not found' });
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

  try {
    const transaction = fromAccount.transferMoney(toAccount.name, amount);
    toAccount.receiveMoney(fromAccount.name, amount);

    data[fromAccountIndex] = fromAccount;
    data[toAccountIndex] = toAccount;

    fs.writeFileSync('accounts.json', JSON.stringify(data));

    res.json({
      message: 'Money received successfully',
      transaction: {
        type: 'receive',
        amount,
        fromName,
        date: new Date()
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

//close account
app.delete('/account/:id', (req, res) => {
  const { id } = req.params;

  const data = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
  const accountIndex = data.findIndex(acc => acc.id === id);

  if (accountIndex === -1) {
    return res.status(404).json({ error: 'Account not found' });
  }

  data.splice(accountIndex, 1);
  fs.writeFileSync('accounts.json', JSON.stringify(data));

  res.json({ message: 'Account closed successfully' });
});



app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});