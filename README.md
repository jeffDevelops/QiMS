```
                                ::::.        .:::::           ..:::..      
                     ::           :: :.     .. ::          .::       ::.   
     ..:::..::                    ::  .::  .   ::           .::             
  .:       ::       .::           ::   .::.    ::               :        
 .::       ::        ::           ::    .:     ::                 ::.     
   ::.  ..:::        ::           ::           ::         .::      .::
           ::       .::.        ..::.         .::..         ..:::.. 
           ::   
           ::
          .::.
```

*Qi /ˈtʃiː/ CHEE (noun, Chinese): vital energy channelled to animate the body*

A headless CMS that makes your database schema the single-source of truth.

When connected to an existing database, qiMS uses Prisma and TypeGraphQL to
introspect your database and creates a CRUD-capable GraphQL API out of the box.

From there, you can use the qiMS admin panel to define new tables, columns,
and relationships--all from the UI. Under the hood, this creates completely
revertable migrations that transform your database to accommodate your new
data structure needs.

When you're ready to deploy to production, qiMS' admin panel lets you create,
read, update, and delete the content of the connected database.

### Installation

Clone the repository:
```
git clone https://github.com/jeffDevelops/QiMS.git
```

Install dependencies:
```
yarn
```

Create an .env file at the root that follows .env.example, and provide your database connection details.

### Interactive CMS Server
QiMS will ask you a few questions 

Start the interactive CMS server:
```
cd server

yarn dev
```