const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./src/index.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProduction ? "[name].[contenthash:8].js" : "bundle.js",
      chunkFilename: isProduction
        ? "[name].[contenthash:8].chunk.js"
        : "[name].chunk.js",
      clean: true,
      assetModuleFilename: isProduction
        ? "assets/[name].[contenthash:8][ext]"
        : "assets/[name][ext]",
    },
    module: {
      rules: [
        // JS/JSX
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    useBuiltIns: "usage",
                    corejs: 3,
                  },
                ],
                "@babel/preset-react",
              ],
              cacheDirectory: true,
            },
          },
        },
        // CSS (отдельный файл для кэша)
        {
          test: /\.css$/,
          use: isProduction
            ? [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"]
            : ["style-loader", "css-loader", "postcss-loader"],
        },
        // Изображения (WebP + AVIF)
        {
          test: /\.(png|jpe?g|gif|webp|avif)$/i,
          type: "asset/resource",
          generator: {
            filename: isProduction
              ? "assets/images/[name].[contenthash:8][ext]"
              : "assets/images/[name][ext]",
          },
        },
        // Шрифты
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
          generator: {
            filename: isProduction
              ? "assets/fonts/[name].[contenthash:8][ext]"
              : "assets/fonts/[name][ext]",
          },
        },
        // Inline SVG
        {
          test: /\.svg$/i,
          type: "asset/inline",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./public/index.html",
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              minifyCSS: true,
              minifyJS: true,
            }
          : false,
        inject: true,
      }),
      // CSS отдельно (длинный кэш)
      new MiniCssExtractPlugin({
        filename: isProduction ? "[name].[contenthash:8].css" : "[name].css",
      }),
    ],
    devServer: {
      static: {
        directory: path.resolve(__dirname, "dist"),
      },
      port: 3000,
      open: true,
      hot: true,
    },
    resolve: {
      extensions: [".js", ".jsx", ".css"],
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    // ✅ ИСПРАВЛЕНО: В DEV splitChunks отключены полностью
    optimization: isProduction
      ? {
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: true,
                },
              },
            }),
          ],
          splitChunks: {
            chunks: "all",
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: "vendors",
                chunks: "all",
                priority: 10,
              },
            },
          },
        }
      : {
          // ✅ DEV MODE: NO SPLIT CHUNKS = один bundle.js
          splitChunks: false,
        },
    cache: {
      type: "filesystem",
      buildDependencies: {
        config: [__filename],
      },
    },
    // 2026 Perf: Preload critical resources
    performance: {
      hints: isProduction ? "warning" : false,
    },
  };
};
