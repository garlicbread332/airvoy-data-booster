const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const ACCESSIBILITY_SERVICE_JAVA = `package com.airvoy.databooster;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.Arrays;
import java.util.List;

public class AirvoyAccessibilityService extends AccessibilityService {
    private static final String TAG = "AirvoyBooster";
    private static final String AIRVOY_PACKAGE = "com.airvoy.app";
    private static final long CLICK_DELAY_MS = 3000L;
    private static final long AD_WATCH_DELAY_MS = 15000L;

    private static final List<String> WATCH_AD_TEXTS = Arrays.asList(
        "Watch Ad", "Watch an Ad", "Watch Video", "Watch video", "Watch ad"
    );
    private static final List<String> CLOSE_AD_TEXTS = Arrays.asList(
        "X", "Close", "Skip", "SKIP", "×", "✕", "close", "skip"
    );

    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean isRunning = false;
    private boolean adPlaying = false;

    public static boolean isServiceRunning = false;
    public static int adsWatched = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!isRunning) return;
        if (event == null) return;

        String pkg = event.getPackageName() != null ? event.getPackageName().toString() : "";
        if (!pkg.contains("airvoy")) return;

        int type = event.getEventType();
        if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            type == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            handler.postDelayed(this::tryClickButtons, 800);
        }
    }

    private void tryClickButtons() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        if (!adPlaying) {
            if (clickNodeWithTexts(root, WATCH_AD_TEXTS)) {
                Log.d(TAG, "Clicked Watch Ad button");
                adPlaying = true;
                handler.postDelayed(this::lookForCloseButton, AD_WATCH_DELAY_MS);
            }
        }
        root.recycle();
    }

    private void lookForCloseButton() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) {
            adPlaying = false;
            return;
        }
        if (clickNodeWithTexts(root, CLOSE_AD_TEXTS)) {
            Log.d(TAG, "Clicked Close/X button");
            adsWatched++;
            adPlaying = false;
            handler.postDelayed(this::tryClickButtons, CLICK_DELAY_MS);
        } else {
            handler.postDelayed(this::lookForCloseButton, 2000);
        }
        root.recycle();
    }

    private boolean clickNodeWithTexts(AccessibilityNodeInfo root, List<String> texts) {
        for (String text : texts) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
            for (AccessibilityNodeInfo node : nodes) {
                if (node != null && node.isClickable()) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    node.recycle();
                    return true;
                }
                if (node != null) {
                    AccessibilityNodeInfo parent = node.getParent();
                    if (parent != null && parent.isClickable()) {
                        parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        parent.recycle();
                        node.recycle();
                        return true;
                    }
                    node.recycle();
                }
            }
        }
        return false;
    }

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        isRunning = true;
        isServiceRunning = true;
        Log.d(TAG, "Accessibility service connected");

        AccessibilityServiceInfo info = getServiceInfo();
        if (info == null) info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED |
                          AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS |
                     AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        info.notificationTimeout = 100;
        setServiceInfo(info);
    }

    @Override
    public void onInterrupt() {
        isRunning = false;
        isServiceRunning = false;
        handler.removeCallbacksAndMessages(null);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        isServiceRunning = false;
        handler.removeCallbacksAndMessages(null);
    }

    public static Intent getEnableIntent() {
        Intent intent = new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }
}
`;

const ACCESSIBILITY_SERVICE_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_description"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows"
    android:canRetrieveWindowContent="true" />
`;

const withAndroidOverlay = (config) => {
  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults;
    const app = manifest.manifest.application[0];

    if (!manifest.manifest["uses-permission"]) {
      manifest.manifest["uses-permission"] = [];
    }

    const perms = manifest.manifest["uses-permission"].map(
      (p) => p.$?.["android:name"]
    );

    const requiredPerms = [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.BIND_ACCESSIBILITY_SERVICE",
    ];

    for (const perm of requiredPerms) {
      if (!perms.includes(perm)) {
        manifest.manifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    if (!app.service) app.service = [];

    const pkg = c.android?.package || "com.airvoy.databooster";
    const serviceName = `${pkg}.AirvoyAccessibilityService`;

    const existing = app.service.find(
      (s) => s.$?.["android:name"] === serviceName
    );
    if (!existing) {
      app.service.push({
        $: {
          "android:name": serviceName,
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.accessibilityservice.AccessibilityService" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.accessibilityservice",
              "android:resource": "@xml/accessibility_service_config",
            },
          },
        ],
      });
    }

    return c;
  });

  config = withDangerousMod(config, [
    "android",
    async (c) => {
      const pkg = c.android?.package || "com.airvoy.databooster";
      const pkgPath = pkg.replace(/\./g, "/");
      const androidSrc = path.join(
        c.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        pkgPath
      );

      fs.mkdirSync(androidSrc, { recursive: true });
      fs.writeFileSync(
        path.join(androidSrc, "AirvoyAccessibilityService.java"),
        ACCESSIBILITY_SERVICE_JAVA.replace(/com\.airvoy\.databooster/g, pkg)
      );

      const xmlDir = path.join(
        c.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "accessibility_service_config.xml"),
        ACCESSIBILITY_SERVICE_CONFIG_XML
      );

      const valuesDir = path.join(
        c.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "values"
      );
      const stringsPath = path.join(valuesDir, "strings.xml");
      if (fs.existsSync(stringsPath)) {
        let stringsXml = fs.readFileSync(stringsPath, "utf8");
        if (!stringsXml.includes("accessibility_service_description")) {
          stringsXml = stringsXml.replace(
            "</resources>",
            `    <string name="accessibility_service_description">Airvoy Data Booster — automatically watches ads to earn free mobile data</string>\n</resources>`
          );
          fs.writeFileSync(stringsPath, stringsXml);
        }
      }

      return c;
    },
  ]);

  return config;
};

module.exports = withAndroidOverlay;
