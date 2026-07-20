# ecommerce-backend-starter

Do get started, 

1. `chmod +x ./db.sh` - allow the `db.sh` script to be runnable
2. `./db.sh < schema.sql` - setup the database
3. `./db.sh < data.sql` - insert sample table

## LFS Error
Sometimes, when pushing in CodeSpace, you may get an error related to LFS. If that's the case, run the commands below in the terminal: (make sure the current working directory is the project folder)
```
rm .git/hooks/post-checkout
rm .git/hooks/post-commit
rm .git/hooks/post-merge
rm .git/hooks/pre-push
```
