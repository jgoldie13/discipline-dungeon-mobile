import SwiftUI

struct AuthView: View {
  @EnvironmentObject var appState: AppState
  @State private var email = ""
  @State private var password = ""
  @State private var loading = false

  var body: some View {
    Form {
      Section("Account") {
        TextField("Email", text: $email)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
        SecureField("Password", text: $password)

        Button(loading ? "Signing in…" : "Sign In") {
          Task {
            loading = true
            await appState.auth.signIn(email: email, password: password)
            loading = false
          }
        }
        .disabled(loading || email.isEmpty || password.isEmpty)

        if let message = appState.auth.statusMessage {
          Text(message).font(.footnote)
        }
      }

      Section("Token") {
        if let token = appState.auth.accessToken {
          Text("Signed in (token stored in Keychain).")
          Text(token)
            .font(.footnote)
            .textSelection(.enabled)
            .lineLimit(4)
        } else {
          Text("Not signed in.")
        }

        Button("Sign Out") {
          appState.auth.signOut()
        }
        .disabled(appState.auth.accessToken == nil)
      }
    }
    .navigationTitle("Sign In")
  }
}

