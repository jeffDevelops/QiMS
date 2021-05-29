
/**
 *  For SQL-in-JS syntax highlighting within VSCode, download vscode-sql-tagged-template-literals:
 *  https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals
 */

    
exports.migrate = function(client, done) {
	var db = client.db;
	const SQL = /* sql */ `

ALTER TABLE
  film_actor
  ADD COLUMN
    id
    SERIAL PRIMARY KEY;

`
  db.query(SQL, [], function(err) {
    if (err) return done(err)
    done()
  });
};

exports.rollback = function(client, done) {
	var db = client.db;
	const SQL = /* sql */ `

ALTER TABLE
  film_actor
  DROP COLUMN
    id;

`
  db.query(SQL, [], function(err) {
    if (err) return done(err)
    done()
  });
};
