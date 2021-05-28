export const NO_DB_PORT_WARNING = `-----------------------------------------------------------------------------
⚠️  No DATABASE_PORT specified in environment variables.
Defaulting to 5432 (the default PostrgresQL port).

If connection fails, ensuring this key is present in
/.env is probably the first thing to check.

If you have your database connection string, the value
you need is whatever appears in the URL for "host" after
the third colon in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality

To suppress this warning, add DATABASE_PORT=5432 to
/.env (if that's where the database
service is running).
-----------------------------------------------------------------------------\n`
