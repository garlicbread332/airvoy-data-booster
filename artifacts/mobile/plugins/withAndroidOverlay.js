const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const PERMISSIONS = [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
];

function addPermissions(manifest) {
  if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
  const existing = manifest["uses-permission"].map((p) => p.$["android:name"]);
  for (const perm of PERMISSIONS) {
    if (!existing.includes(perm)) {
      manifest["uses-permission"].push({ $: { "android:name": perm } });
    }
  }
}

function addService(manifest) {
  const app = manifest.application[0];
  if (!app.service) app.service = [];
  const existing = app.service.map((s) => s.$["android:name"]);
  if (!existing.includes(".FloatingOverlayService")) {
    app.service.push({
      $: {
        "android:name": ".FloatingOverlayService",
        "android:foregroundServiceType": "specialUse",
        "android:exported": "false",
      },
      "property": [
        {
          $: {
            "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
            "android:value": "data booster overlay",
          },
        },
      ],
    });
  }
}

function writeKotlinFiles(projectRoot, packageName) {
  const packagePath = packageName.replace(/\./g, "/");
  const srcDir = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    ...packagePath.split("/")
  );
  fs.mkdirSync(srcDir, { recursive: true });

  const pluginSrc = path.join(__dirname, "src");
  for (const file of ["FloatingOverlayService.kt", "OverlayModule.kt", "OverlayPackage.kt"]) {
    let content = fs.readFileSync(path.join(pluginSrc, file), "utf8");
    content = content.replace(/PACKAGE_NAME/g, packageName);
    fs.writeFileSync(path.join(srcDir, file), content);
  }
}

function registerPackageInMainApplication(contents) {
  if (contents.includes("OverlayPackage()")) return contents;
  return contents.replace(
    /PackageList\(this\)\.packages\.apply\s*\{/,
    "PackageList(this).packages.apply {\n          add(OverlayPackage())"
  );
}

const withAndroidOverlay = (config) => {
  config = withAndroidManifest(config, (c) => {
    addPermissions(c.modResults.manifest);
    addService(c.modResults.manifest);
    return c;
  });

  config = withDangerousMod(config, [
    "android",
    (c) => {
      const pkg = c.android?.package || "com.airvoy.databooster";
      writeKotlinFiles(c.modResults.projectRoot, pkg);
      return c;
    },
  ]);

  config = withMainApplication(config, (c) => {
    c.modResults.contents = registerPackageInMainApplication(c.modResults.contents);
    return c;
  });

  return config;
};

module.exports = withAndroidOverlay;
