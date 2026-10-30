import UIKit
import Capacitor

/// The app's web view. Registers the plugins that live in this app rather
/// than in an npm package (Main.storyboard uses this class).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RoutineCuesPlugin())
    }
}
