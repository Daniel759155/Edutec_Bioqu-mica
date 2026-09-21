document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("contato-form");
  var status = document.getElementById("contato-status");
  if (!form || !status) return;

  var DESTINO = "bioquimica22ati@gmail.com";

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("erro", Boolean(isError));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var fields = form.querySelectorAll("input, textarea");
    var firstInvalid = null;
    fields.forEach(function (field) {
      var ok = field.checkValidity() && field.value.trim() !== "";
      field.classList.toggle("invalid", !ok);
      if (!ok && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      setStatus("Preencha todos os campos com um e-mail válido.", true);
      firstInvalid.focus();
      return;
    }

    var nome = form.elements.nome.value.trim();
    var email = form.elements.email.value.trim();
    var assunto = form.elements.assunto.value.trim();
    var mensagem = form.elements.mensagem.value.trim();

    var corpo = mensagem + "\n\n—\n" + nome + "\n" + email;
    window.location.href =
      "mailto:" + DESTINO + "?subject=" + encodeURIComponent(assunto) + "&body=" + encodeURIComponent(corpo);

    setStatus("Abrindo seu aplicativo de e-mail para enviar a mensagem…", false);
  });

  form.addEventListener("input", function (e) {
    e.target.classList.remove("invalid");
  });
});
