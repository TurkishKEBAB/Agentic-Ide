# Config Şeması Doğrulama Kaydı

**Tarih:** 7 Ekim 2026. **Durum:** Planning şema kontrolleri geçti; uygulama kontrolleri uygulanmadı.
**İlgili öneri:** [ADR-010](../../docs/adr/ADR-010-secret-storage-and-ipc-broker.md).

`docs/schemas/config.schema.json`, Python `jsonschema` Draft202012Validator ile 29 kabul/ret örneğine karşı kontrol edildi.
Validator paketi geçici araç dizinine kuruldu; proje runtime bağımlılığı veya uygulama kaynak kodu eklenmedi.
Şemanın kendisi `check_schema` ile doğrulandı. Aşağıdaki örnekler tüm diğer zorunlu alanları geçerli sentetik bir
config içinde değiştirilerek test edildi; gerçek API anahtarı, kullanıcı verisi veya provider çağrısı kullanılmadı.

| Kontrol grubu | Örnekler | Beklenen / sonuç |
|---|---|---|
| Loopback ve port sınırları | `http://localhost`, `http://localhost:11434/`, `https://localhost:443`, `http://127.0.0.1:1`, `http://127.0.0.1:65535`, `http://[::1]:11434`, `https://[::1]/` | 7 kabul: geçti |
| Uzak endpoint | `http://192.168.1.2:11434`, `https://ollama.example.com` | 2 ret: geçti |
| Host/userinfo bypass | `http://localhost.attacker.example`, `http://127.0.0.1.attacker.example`, `http://localhost@remote.example`, `http://user:pass@localhost:11434`, `http://%6cocalhost:11434`, `http://[::ffff:127.0.0.1]:11434` | 6 ret: geçti |
| Protocol/port | `file://localhost`, port `0`, `65536`, `99999`, `00080` | 5 ret: geçti |
| Ek path/query/fragment | `/api`, `/?target=remote`, `/#fragment`, `//` | 4 ret: geçti |
| Gizlilik kuralı | `respectAgentIgnore: false` | Ret: geçti |
| Kullanıcı ek filtreleri | `excludeSecretPatterns: ["*.private"]` | Kabul: geçti |
| Boş secret referansı | `apiKeyRef: ""` | Ret: geçti |
| Ham anahtar alanı | Anthropic config'e `apiKey` alanı eklemek | Ret: geçti |
| Boş kullanıcı ekleri | `excludeSecretPatterns: []` | Kabul: geçti; zorunlu built-in filtrelerin runtime union kuralı korunmalı |

Ek olarak [SAFETY_AND_GUARDRAILS](../../SAFETY_AND_GUARDRAILS.md) §2.5 JSON örneği,
`audit-event.schema.json` ve `FormatChecker` ile tam şema/date-time doğrulamasından geçti.

Bu sonuçlar secret store'un var olduğunu veya anahtar sızdırmadığını, `.agentignore`/built-in union'ın çalıştığını,
DNS/redirect davranışını, IPC authorization'ı veya local-only network garantisini göstermez. `apiKeyRef` için minimum
uzunluk kontrolü, verilen metnin gerçek bir secret reference olduğunu kanıtlamaz; referansı broker üretmeli/çözmelidir.
Bunlar ADR-010 implementation spike'ında çalışma zamanı kabul kriterleri olarak beklemektedir.
