// Copy-paste SDKs for client apps. No package to install: one small file per platform.
export type SdkKey = 'rn' | 'swift' | 'kotlin' | 'flutter';

export function sdkCode(kind: SdkKey, api: string, site: string): { file: string; code: string; usage: string } {
	const url = `${api}/api/app`;
	if (kind === 'rn')
		return {
			file: 'undercut.ts',
			code: `// undercut.ts — React Native / Expo. No dependency.
import { Platform } from 'react-native';
const API = '${url}';
const SITE = '${site}';
const VERSION = '1.0.0'; // your app version (or expo-application nativeApplicationVersion)
const U = Math.random().toString(36).slice(2, 12); // anonymous id (persist it with AsyncStorage if you want)
let q: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function ev(t: string, data: Record<string, unknown> = {}) {
  q.push({ t, u: U, pf: Platform.OS === 'ios' ? 'ios' : 'android', av: VERSION, os: String(Platform.Version), ...data });
  clearTimeout(timer);
  timer = setTimeout(flush, t === 'error' ? 0 : 3000);
}
export function flush() {
  if (!q.length) return;
  const events = q.splice(0);
  fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ site: SITE, events }) }).catch(() => {});
}

export const undercut = {
  start() {
    ev('session');
    const prev = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((e: Error, fatal?: boolean) => {
      undercut.error(e, fatal);
      prev?.(e, fatal);
    });
  },
  screen: (name: string) => ev('screen', { name }),
  paywall: (paywall: string, variant?: string) => ev('paywall_view', { pw: paywall, vr: variant }),
  paywallClosed: (paywall: string, variant?: string) => ev('paywall_close', { pw: paywall, vr: variant }),
  trial: (product: string, paywall?: string, variant?: string) => ev('trial_start', { pr: product, pw: paywall, vr: variant }),
  purchase: (product: string, price: number, currency = 'EUR', paywall?: string, variant?: string) => ev('purchase', { pr: product, price, cur: currency, pw: paywall, vr: variant }),
  error: (e: unknown, fatal = false) => ev('error', { msg: e instanceof Error ? \`\${e.name}: \${e.message}\` : String(e), stack: e instanceof Error ? e.stack : undefined, fatal })
};`,
			usage: `// App.tsx
import { undercut } from './undercut';
undercut.start();

// on your paywall screen
undercut.paywall('onboarding', 'B · yearly first');
// after a successful purchase (RevenueCat, StoreKit, Play Billing…)
undercut.purchase('premium_yearly', 49.99, 'EUR', 'onboarding', 'B · yearly first');
// trial started
undercut.trial('premium_yearly', 'onboarding');
// any caught error
try { … } catch (e) { undercut.error(e); }`
		};
	if (kind === 'swift')
		return {
			file: 'Undercut.swift',
			code: `// Undercut.swift — iOS (SwiftUI / UIKit). No dependency.
import Foundation
import UIKit

enum Undercut {
    static let api = URL(string: "${url}")!
    static let site = "${site}"
    static let user = UserDefaults.standard.string(forKey: "uc_id") ?? {
        let id = UUID().uuidString.prefix(12).lowercased(); UserDefaults.standard.set(id, forKey: "uc_id"); return String(id)
    }()
    static let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""

    static func send(_ t: String, _ data: [String: Any] = [:]) {
        var e: [String: Any] = ["t": t, "u": user, "pf": "ios", "av": version, "os": UIDevice.current.systemVersion]
        data.forEach { e[$0.key] = $0.value }
        var req = URLRequest(url: api); req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["site": site, "events": [e]])
        URLSession.shared.dataTask(with: req).resume()
    }
    static func start() {
        send("session")
        NSSetUncaughtExceptionHandler { ex in
            Undercut.send("error", ["msg": "\\(ex.name.rawValue): \\(ex.reason ?? "")", "stack": ex.callStackSymbols.joined(separator: "\\n"), "fatal": true])
            Thread.sleep(forTimeInterval: 1)
        }
    }
    static func paywall(_ id: String, variant: String? = nil) { send("paywall_view", ["pw": id, "vr": variant ?? ""]) }
    static func trial(_ product: String, paywall: String? = nil) { send("trial_start", ["pr": product, "pw": paywall ?? ""]) }
    static func purchase(_ product: String, price: Double, currency: String = "EUR", paywall: String? = nil, variant: String? = nil) {
        send("purchase", ["pr": product, "price": price, "cur": currency, "pw": paywall ?? "", "vr": variant ?? ""])
    }
    static func error(_ error: Error, fatal: Bool = false) { send("error", ["msg": String(describing: error), "fatal": fatal]) }
}`,
			usage: `// App start (App.init or AppDelegate)
Undercut.start()

// paywall shown / purchase done
Undercut.paywall("onboarding", variant: "B")
Undercut.purchase("premium_yearly", price: 49.99, paywall: "onboarding", variant: "B")`
		};
	if (kind === 'kotlin')
		return {
			file: 'Undercut.kt',
			code: `// Undercut.kt — Android. No dependency.
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlin.concurrent.thread

object Undercut {
    private const val API = "${url}"
    private const val SITE = "${site}"
    private val user = UUID.randomUUID().toString().take(12)
    var version = ""

    fun send(t: String, data: Map<String, Any?> = emptyMap()) = thread {
        val e = JSONObject(mapOf("t" to t, "u" to user, "pf" to "android", "av" to version, "os" to Build.VERSION.RELEASE) + data.filterValues { it != null })
        runCatching {
            (URL(API).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"; doOutput = true; setRequestProperty("content-type", "application/json")
                outputStream.write(JSONObject(mapOf("site" to SITE, "events" to JSONArray(listOf(e)))).toString().toByteArray())
                responseCode; disconnect()
            }
        }
    }
    fun start(appVersion: String) {
        version = appVersion; send("session")
        val prev = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { th, ex ->
            send("error", mapOf("msg" to ex.toString(), "stack" to ex.stackTraceToString().take(3000), "fatal" to true)).join(1500)
            prev?.uncaughtException(th, ex)
        }
    }
    fun paywall(id: String, variant: String? = null) = send("paywall_view", mapOf("pw" to id, "vr" to variant))
    fun trial(product: String, paywall: String? = null) = send("trial_start", mapOf("pr" to product, "pw" to paywall))
    fun purchase(product: String, price: Double, currency: String = "EUR", paywall: String? = null, variant: String? = null) =
        send("purchase", mapOf("pr" to product, "price" to price, "cur" to currency, "pw" to paywall, "vr" to variant))
    fun error(e: Throwable, fatal: Boolean = false) = send("error", mapOf("msg" to e.toString(), "stack" to e.stackTraceToString().take(3000), "fatal" to fatal))
}`,
			usage: `// Application.onCreate
Undercut.start(BuildConfig.VERSION_NAME)

Undercut.paywall("onboarding", "B")
Undercut.purchase("premium_yearly", 49.99, "EUR", "onboarding", "B")`
		};
	return {
		file: 'undercut.dart',
		code: `// undercut.dart — Flutter. Needs the "http" package.
import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:math';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class Undercut {
  static const api = '${url}';
  static const site = '${site}';
  static final user = Random().nextInt(1 << 32).toRadixString(36);
  static String version = '';

  static Future<void> send(String t, [Map<String, dynamic> data = const {}]) async {
    final e = {'t': t, 'u': user, 'pf': Platform.isIOS ? 'ios' : 'android', 'av': version, ...data}..removeWhere((k, v) => v == null);
    try { await http.post(Uri.parse(api), headers: {'content-type': 'application/json'}, body: jsonEncode({'site': site, 'events': [e]})); } catch (_) {}
  }
  static void start(String appVersion) {
    version = appVersion; send('session');
    FlutterError.onError = (d) { send('error', {'msg': d.exceptionAsString(), 'stack': d.stack.toString(), 'fatal': true}); FlutterError.presentError(d); };
    PlatformDispatcher.instance.onError = (e, s) { send('error', {'msg': e.toString(), 'stack': s.toString(), 'fatal': true}); return false; };
  }
  static void paywall(String id, {String? variant}) => send('paywall_view', {'pw': id, 'vr': variant});
  static void trial(String product, {String? paywall}) => send('trial_start', {'pr': product, 'pw': paywall});
  static void purchase(String product, double price, {String currency = 'EUR', String? paywall, String? variant}) =>
      send('purchase', {'pr': product, 'price': price, 'cur': currency, 'pw': paywall, 'vr': variant});
}`,
		usage: `// main()
Undercut.start('1.0.0');

Undercut.paywall('onboarding', variant: 'B');
Undercut.purchase('premium_yearly', 49.99, paywall: 'onboarding', variant: 'B');`
	};
}
