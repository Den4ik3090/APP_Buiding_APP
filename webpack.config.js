const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");

require("dotenv").config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./src/index.js",
    
 output: {
  path: path.resolve(__dirname, "dist"),
  publicPath: "/",
  filename: isProduction ? "js/[name].[contenthash:8].js" : "js/bundle.js",
  chunkFilename: isProduction ? "js/[name].[contenthash:8].chunk.js" : "js/[name].chunk.js",
  assetModuleFilename: "assets/[name].[contenthash:8][ext]",
  clean: true,
},
    module: {
      rules: [
        // --- JS/TS Processing ---
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                ["@babel/preset-env", { useBuiltIns: "usage", corejs: 3 }],
                "@babel/preset-react",
                "@babel/preset-typescript",
              ],
              cacheDirectory: true,
            },
          },
        },

        // --- Styles: Standard CSS/SCSS ---
        {
          test: /\.(s[ac]ss|css)$/i,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "postcss-loader",
            "sass-loader",
          ],
        },

        // --- Assets: Images & Fonts ---
        {
          test: /\.(png|jpe?g|gif|webp|avif)$/i,
          type: "asset/resource",
          generator: { filename: "assets/images/[name].[contenthash:8][ext]" },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
          generator: { filename: "assets/fonts/[name].[contenthash:8][ext]" },
        },
        {
          test: /\.svg$/i,
          type: "asset/inline",
        },
      ],
    },

    plugins: [
      new webpack.DefinePlugin({
        "process.env.REACT_APP_SUPABASE_URL": JSON.stringify(process.env.REACT_APP_SUPABASE_URL),
        "process.env.REACT_APP_SUPABASE_KEY": JSON.stringify(process.env.REACT_APP_SUPABASE_KEY),
        "process.env.REACT_APP_SENTRY_DSN": JSON.stringify(process.env.REACT_APP_SENTRY_DSN),
      }),

      new HtmlWebpackPlugin({
        template: "./public/index.html",
        inject: true,
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        } : false,
      }),

      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: "css/[name].[contenthash:8].css",
          chunkFilename: "css/[name].[contenthash:8].chunk.css",
        }),
      ] : []),
    ],

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              passes: 2,
            },
          },
        }),
      ],
      splitChunks: isProduction ? {
        chunks: "all",
        cacheGroups: {
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: "recharts",
            chunks: "all",
            priority: 10,
          },
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      } : false,
    },

    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"],
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    devServer: {
      static: { directory: path.resolve(__dirname, "dist") },
      port: 3000,
      open: true,
      hot: true,
      historyApiFallback: true, // Полезно для React Router
      client: { logging: "warn" },
    },

    cache: {
      type: "filesystem",
      buildDependencies: { config: [__filename] },
    },

    performance: {
      hints: isProduction ? "warning" : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },

    devtool: isProduction ? false : "eval-cheap-module-source-map",
  };
};