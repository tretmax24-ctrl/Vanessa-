from pathlib import Path

manifest = Path("android/app/src/main/AndroidManifest.xml")
manifest_text = manifest.read_text()

permissions = [
    '    <uses-permission android:name="android.permission.CAMERA" />\n',
    '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n',
    '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n',
]
marker = '<manifest '
insert_at = manifest_text.find('>') + 1
existing = manifest_text[:insert_at]
rest = manifest_text[insert_at:]
for permission in permissions:
    if permission.strip() not in manifest_text:
        existing += '\n' + permission
manifest.write_text(existing + rest)

main = Path("android/app/src/main/java/com/max/social/MainActivity.java")
main.parent.mkdir(parents=True, exist_ok=True)
main.write_text(r'''package com.max.social;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int MAX_PERMISSION_REQUEST = 5001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestMaxPermissions();
    }

    private void requestMaxPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;

        java.util.ArrayList<String> permissions = new java.util.ArrayList<>();
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CAMERA);
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!permissions.isEmpty()) {
            requestPermissions(permissions.toArray(new String[0]), MAX_PERMISSION_REQUEST);
        }
    }
}
''')
