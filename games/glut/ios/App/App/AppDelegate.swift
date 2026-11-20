import UIKit
import Capacitor
import GameKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

/// Widok gry: odracza systemowe gesty przy krawędziach ekranu. Bez tego przesunięcie palcem w dół
/// przy dolnej krawędzi włącza „Reachability” (cały ekran zjeżdża do połowy), a przy górnej
/// Centrum powiadomień. Z odroczeniem pierwszy ruch trafia do gry, system reaguje dopiero na drugi.
class GameViewController: CAPBridgeViewController {
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { [.top, .bottom] }

    /// Wtyczki z kodu aplikacji (nie z npm) rejestrujemy ręcznie.
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(GameServicesPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Bez przewijania i „gumowania” widoku WebView: gra zajmuje cały ekran.
        webView?.scrollView.isScrollEnabled = false
        webView?.scrollView.bounces = false
        setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
    }
}

/// Tablice wyników przez Game Center. Część JS: `gameServices` w @funfactory/core.
@objc(GameServicesPlugin)
public class GameServicesPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "GameServicesPlugin"
    public let jsName = "GameServices"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
    ]

    /// Ostatni błąd Game Center (np. „application is not recognized”), do diagnostyki.
    private var lastError = ""

    private func playerInfo() -> [String: Any] {
        let p = GKLocalPlayer.local
        return ["authenticated": p.isAuthenticated, "playerId": p.isAuthenticated ? p.gamePlayerID : "", "alias": p.isAuthenticated ? p.alias : "", "error": lastError]
    }

    /// Logowanie: Game Center może pokazać własne okno; wynik wraca, gdy gracz się zaloguje albo je zamknie.
    @objc func signIn(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        if player.isAuthenticated {
            call.resolve(playerInfo())
            return
        }
        var answered = false
        player.authenticateHandler = { [weak self] viewController, error in
            guard let self = self else { return }
            NSLog("[GameCenter] auth: vc=%@ authenticated=%@ error=%@", viewController == nil ? "no" : "yes", GKLocalPlayer.local.isAuthenticated ? "yes" : "no", error?.localizedDescription ?? "none")
            self.lastError = error?.localizedDescription ?? ""
            if let viewController = viewController {
                DispatchQueue.main.async { self.bridge?.viewController?.present(viewController, animated: true) }
                return
            }
            if !answered {
                answered = true
                call.resolve(self.playerInfo())
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let id = call.getString("leaderboardId"), let score = call.getInt("score") else {
            call.reject("leaderboardId i score są wymagane")
            return
        }
        guard GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["submitted": false])
            return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
            NSLog("[GameCenter] submit %@ %d: %@", id, score, error?.localizedDescription ?? "ok")
            call.resolve(["submitted": error == nil, "error": error?.localizedDescription ?? ""])
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let controller: GKGameCenterViewController
            if let id = call.getString("leaderboardId") {
                controller = GKGameCenterViewController(leaderboardID: id, playerScope: .global, timeScope: .allTime)
            } else {
                controller = GKGameCenterViewController(state: .leaderboards)
            }
            controller.gameCenterDelegate = self
            self.bridge?.viewController?.present(controller, animated: true)
            call.resolve()
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
