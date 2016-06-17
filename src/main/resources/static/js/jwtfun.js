$(document).ready(function () {
    var jwtEncodedTextArea = document.getElementById('jwt-encoded');
    jwtEncoded = CodeMirror.fromTextArea(jwtEncodedTextArea, {
        mode: 'application/json',
        lineWrapping: true
    });
    jwtEncoded.getDoc().setValue("eyJhbGciOiJIUzI1NiJ9.eyJjdXN0b20iOiJteUN1c3RvbSIsInN1YiI6Ik1FIn0.-zjvjy84KOywU4yUS5un1V-5tkBtaMsqRJrmTc3xR5w");
    jwtEncoded.setSize(430, 250);

    var jwtHeaderTextArea = document.getElementById('jwt-header');
    jwtHeader = CodeMirror.fromTextArea(jwtHeaderTextArea, {
        mode: 'application/json',
        lineNumbers: true,
        matchBrackets: true
    });
    jwtHeader.getDoc().setValue('{\n\t"alg": "HS256"\n}');
    jwtHeader.setSize(430, 90);

    var jwtPayloadTextArea = document.getElementById('jwt-payload');
    jwtPayload = CodeMirror.fromTextArea(jwtPayloadTextArea, {
        mode: 'application/json',
        lineNumbers: true,
        matchBrackets: true
    });
    jwtPayload.getDoc().setValue('{\n\t"sub": "ME",\n\t"custom": "myCustom"\n}');
    jwtPayload.setSize(430, 120);

    var jwtBuilderTextArea = document.getElementById('jwt-builder');
    jwtBuilder = CodeMirror.fromTextArea(jwtBuilderTextArea, {
        lineNumbers: true,
        matchBrackets: true
    });
    jwtBuilder.getDoc().setValue('String jwtStr = Jwts.builder()\n\t.setSubject("ME")\n\t.claim("custom", "myCustom")\n\t.signWith(\n\t\tSignatureAlgorithm.HS256,\n\t\t"secret".getBytes("UTF-8")\n\t)\n\t.compact();');
    jwtBuilder.setSize(430, 250);

    var jwtParserTextArea = document.getElementById('jwt-parser');
    jwtParser = CodeMirror.fromTextArea(jwtParserTextArea, {
        lineNumbers: true,
        matchBrackets: true
    });
    jwtParser.getDoc().setValue('Jwt jwt = Jwts.parser()\n\t.requireSubject("ME")\n\t.require("custom", "myCustom")\n\t.setSigningKey(\n\t\t"secret".getBytes("UTF-8")\n\t)\n\t.parse(jwtStr);');
    jwtParser.setSize(430, 250);

    jwtHeader.on('change', function () {
        // need to update jwtBuilder, jwtParser and jwt sections
        buildJavaJWTBuilderCode();
    });

    jwtPayload.on('change', function () {
        // need to update jwtBuilder, jwtParser and jwt sections
        buildJavaJWTBuilderCode();
    });

    $('#secret').keyup(function () {
        // need to update jwtBuilder, jwtParser and jwt sections
        buildJavaJWTBuilderCode();
    });

    $('#require_claims').click(function () {
        buildJavaJWTBuilderCode();
    });

    $.blockUI.defaults.css.width = '70%';
});

function parseJWTJSON() {
    var headerStr = jwtHeader.getValue();
    var payloadStr = jwtPayload.getValue();
    var secret = $('#secret').val();

    // lets make some json
    var header = {};
    var payload = {};
    try {
        header = JSON.parse(headerStr);
    } catch (err) {
        // parse error is ok. user might just be in the middle of editing
        blockJava('Fix yer JSON, Son!');
        return;
    }

    try {
        payload = JSON.parse(payloadStr);
    } catch (err) {
        // parse error is ok. user might just be in the middle of editing
        blockJava('Fix yer JSON, Son!');
        return;
    }

    if (!secret) {
        blockJava('Fix yer secret, Son!');
        return;
    }

    unblockJava();

    return {
        header: header,
        payload: payload,
        secret: secret
    }
}

function buildJavaJWTBuilderCode() {
    var jwtParts = parseJWTJSON();
    if (!jwtParts) { return; }

    doBuildJWT(jwtParts);

    var javaPreStr = 'String jwtStr = Jwts.builder()\n';
    var javaMiddle = '';
    var javaPostStr = '\t.signWith(\n\t\tSignatureAlgorithm.HS256,\n\t\t"' +
        jwtParts.secret + '".getBytes("UTF-8")\n\t)\n\t.compact();';

    _.each(jwtParts.payload, function (val, key) {
       javaMiddle += '\t' + composeClaim('set', key, val) + '\n';
    });

    jwtBuilder.setValue(javaPreStr + javaMiddle + javaPostStr);

    javaPreStr = 'Jwt jwt = Jwts.parser()\n';
    javaMiddle = '';
    javaPostStr = '\t.setSigningKey(\n\t\t"' + jwtParts.secret + '".getBytes("UTF-8")\n\t)\n\t.parse(jwtStr);';

    if ($('#require_claims').prop("checked") == true) {
        _.each(jwtParts.payload, function (val, key) {
            javaMiddle += '\t' + composeClaim('require', key, val) + '\n';
        });
    }

    jwtParser.setValue(javaPreStr + javaMiddle + javaPostStr);
}

function doBuildJWT(jwtParts) {

    // $.post("/buildJWT", jwtParts)
    //     .done(function (response) {
    //         // var jwt = response.jwt;
    //         // var headerIdx = jwt.indexOf('.') + 1;
    //         // var payloadIdx = jwt.lastIndexOf('.') + 1;
    //         // var header = jwt.substring(0, headerIdx);
    //         // var payload =  jwt.substring(headerIdx, payloadIdx);
    //         // var signature = jwt.substring(payloadIdx);
    //         //
    //         // $('#jwt-header-encoded').html(header);
    //         // $('#jwt-payload-encoded').html(payload);
    //         // $('#jwt-signature-encoded').html(signature);
    //         jwtEncoded.setValue(response.jwt);
    //     });

    $.ajax({
        url: "buildJWT",
        method: "POST",
        data: JSON.stringify(jwtParts),
        dataType: 'json',
        contentType: "application/json",
        success: function (response, status, jqXHR) {
            jwtEncoded.setValue(response.jwt);
        },
        error: function (jqXHR, textStatus, errorThrown){
            //Do something
        }
    });
}

function unblockJava() {
    $('#jwt-builder-div').unblock();
    $('#jwt-parser-div').unblock();
}

function blockJava(msg) {
    blockIfNotBlocked('#jwt-builder-div', msg);
    blockIfNotBlocked('#jwt-parser-div', msg);
}

function isBlocked(elemId) {
    var data = $(elemId).data()
    return data["blockUI.isBlocked"] == 1;
}

function blockIfNotBlocked(elemId, msg) {
    if (!isBlocked(elemId)) {
        $(elemId).block({
            message: '<h4>' + msg + '</h4>',
            css: { border: '3px solid #a00' }
        });
    }
}

function composeClaim(pre, key, val) {

    var standardClaims = {
        'iss': { method: 'Issuer', type: "string" },
        'sub': { method: 'Subject', type: "string" },
        'aud': { method: 'Audience', type: "string" },
        'exp': { method: 'Expiration', type: "number" },
        'nbf': { method: 'NotBefore', type: "number" },
        'iat': { method: 'IssuedAt', type: "number" },
        'jti': { method: 'Id', type: "string" }
    };

    var setter = standardClaims[key];
    var type = typeof val;
    if (type === "string") {
        val = '"' + val + '"';
    } else if (type === "number") {
        val = 'new Date(' + val + ')';
    }

    if (!setter) {
        var method = 'require';
        if (pre === 'set') {
            method = 'claim';
        }
        return '.' + method + '("' + key + '", ' + val + ')';
    } else if (setter.type !== type) {
        blockJava("'" + key + "' must be type: " + setter.type);
    } else {
        return '.' + pre + setter.method + '(' + val + ')';
    }
}