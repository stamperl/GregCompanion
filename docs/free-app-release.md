# Free App Release

This lane publishes Click Foundry as an installable PWA on Cloudflare Pages and adds a signed Android APK download at `/downloads/click-foundry-android.apk`.

## One-Time Setup

1. Log in to Cloudflare Wrangler:

```bash
npm exec -- wrangler login
```

2. Create the Pages project in Cloudflare. Use `click-foundry` unless you also pass `--project-name` to the release script.

3. Create and back up the Android release key outside this repo:

```bash
mkdir %USERPROFILE%\.click-foundry
keytool -genkeypair -v -keystore %USERPROFILE%\.click-foundry\android-release.jks -alias click-foundry -keyalg RSA -keysize 2048 -validity 10000
```

4. Copy `android/keystore.properties.example` to `android/keystore.properties` and fill in the passwords.

Never commit `android/keystore.properties` or the `.jks` file. Losing the `.jks` means future APKs cannot upgrade existing installs smoothly.

5. Use JDK 21 for Android release builds. The release script automatically prefers `%USERPROFILE%\.click-foundry\jdk-21` when it exists. To use a different JDK 21 path, set `CLICK_FOUNDRY_JAVA_HOME`.

## Build Without Deploying

```bash
npm run release:free-app -- --skip-deploy --allow-dirty
```

This validates the app, builds the PWA, builds the signed APK, and copies it to `dist/downloads/click-foundry-android.apk`.

## Publish

Commit the release-ready source, then run:

```bash
npm run release:free-app
```

The default public URLs are:

- `https://click-foundry.pages.dev/`
- `https://click-foundry.pages.dev/downloads/click-foundry-android.apk`
