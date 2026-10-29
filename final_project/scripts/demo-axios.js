'use strict';
// Run while the API server is active: node scripts/demo-axios.js
const { getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle } =
  require('../router/general.js');

(async () => {
  try {
    const [all, isbn, author, title] = await Promise.all([
      getAllBooks(),
      getBookByISBN('1'),
      getBooksByAuthor('Jane Austen'),
      getBooksByTitle('Pride and Prejudice'),
    ]);
    console.log('Books in catalog:', Object.keys(all).length);
    console.log('ISBN 1:', isbn);
    console.log('Jane Austen:', author);
    console.log('Pride and Prejudice:', title);
    console.log('All four Axios calls completed successfully.');
  } catch (error) {
    console.error('Axios check failed:', error.message);
    process.exitCode = 1;
  }
})();
