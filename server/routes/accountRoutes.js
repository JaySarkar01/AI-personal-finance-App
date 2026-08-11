const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getAccounts,
  getAccountSummary,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} = require('../controllers/accountController');

router.use(protect);

router.route('/')
  .get(getAccounts)
  .post(createAccount);

router.get('/summary', getAccountSummary);

router.route('/:id')
  .get(getAccount)
  .put(updateAccount)
  .delete(deleteAccount);

module.exports = router;
