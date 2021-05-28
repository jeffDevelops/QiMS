export const NO_DB_PASSWORD_WARNING = `-----------------------------------------------------------------------------
⚠️  No DATABASE_PASSWORD specified in environment variables.
Assuming connection doesn't require one.

If connection permission is denied, ensuring this key is
present in /.env is probably the first thing
to check.

If you have your database connection string, the value
you need is whatever appears in the URL for "password"
after the second colon in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality

We hope that you'll remove this warning by protecting
your database with a password, but you may suppress
this warning by adding DATABASE_PASSWORD_OPT_OUT=true
to /.env
-----------------------------------------------------------------------------\n`
