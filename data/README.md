# SalesSight data folder

Use this folder for your own datasets (e.g. Kaggle downloads).

## How to add your Kaggle zip files

1. **Copy or move the zip files here**
   - From Finder (Mac): drag the `.zip` files from your Downloads (or wherever you saved them) into this `data` folder.
   - Or from Terminal:
     ```bash
     cp ~/Downloads/your-dataset.zip /Users/vandanagrover/SalesSight/data/
     ```
   - Replace `your-dataset.zip` with the actual filename(s).

2. **Optional: unzip to use the CSV/JSON inside**
   - Unzip into a **subfolder** so different datasets don’t overwrite each other (e.g. two zips both containing `train.csv`):
     ```bash
     cd /Users/vandanagrover/SalesSight/data
     unzip superstore-sales.zip -d superstore-sales
     unzip store-sales-time-series-forecasting.zip -d store-sales-time-series-forecasting
     unzip google-trends.zip -d google-trends
     ```
   - Use `-d foldername` so all files go into that folder. Then upload the CSV/JSON files via **Dashboard → Upload historical dataset**.

3. **Keep zips and extracted files organized**
   - Example layout:
     ```
     data/
       kaggle-sales-2024.zip
       kaggle-sales-2024/     (after unzip)
         sales.csv
         products.csv
     ```

This folder is for your local use. Add `data/*.zip` and `data/*/` to `.gitignore` if you don’t want to commit large datasets to git.
